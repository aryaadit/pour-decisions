import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://onpalate.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    };
  }
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// ── Taste profile builder ──────────────────────────────────────────────────

interface DrinkRow {
  name: string;
  type: string;
  rating: number;
  brand?: string;
}

function buildTasteContext(drinks: DrinkRow[]): string {
  const count = drinks.length;

  if (count < 5) {
    return "";
  }

  if (count < 15) {
    // Light personalization
    const top5 = drinks.slice(0, 5);
    const typeCounts: Record<string, number> = {};
    drinks.forEach((d) => {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    return `\n\n--- USER TASTE PROFILE (${count} drinks logged — light personalization) ---
This user is still building their taste profile. Use their preferences as a light signal but blend with general quality recommendations.

Top rated drinks:
${top5.map((d) => `- ${d.name} (${d.type}, rated ${d.rating}/5)`).join("\n")}

Most logged types: ${topTypes.join(", ")}`;
  }

  // Full personalization
  const top10 = drinks.slice(0, 10);
  const bottom3 = [...drinks].sort((a, b) => a.rating - b.rating).slice(0, 3);
  const typeCounts: Record<string, number> = {};
  drinks.forEach((d) => {
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
  });
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const topTypes = sortedTypes.slice(0, 3).map(([t, c]) => `${t} (${c})`);
  const leastTypes = sortedTypes.slice(-2).map(([t, c]) => `${t} (${c})`);

  return `\n\n--- USER TASTE PROFILE (${count} drinks logged — full personalization) ---
Base recommendations primarily on this user's taste profile.

Top rated drinks:
${top10.map((d) => `- ${d.name} (${d.type}, rated ${d.rating}/5)`).join("\n")}

Drinks they didn't enjoy (avoid similar):
${bottom3.map((d) => `- ${d.name} (${d.type}, rated ${d.rating}/5)`).join("\n")}

Most preferred types: ${topTypes.join(", ")}
Least preferred types: ${leastTypes.join(", ")}`;
}

function buildNetworkContext(
  networkDrinks: { name: string; type: string; avg_rating: number; count: number }[]
): string {
  if (networkDrinks.length === 0) return "";

  return `\n\n--- DRINKS YOUR NETWORK RATES HIGHLY ---
${networkDrinks
  .map(
    (d) =>
      `- ${d.name} (${d.type}, avg ${d.avg_rating.toFixed(1)}/5 from ${d.count} people)`
  )
  .join("\n")}`;
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } =
      await supabaseClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    console.log(`[scan-menu] Authenticated user: ${userId}`);

    // Parse body
    const body = await req.json();
    const { image, mimeType, menuText, maxPrice, drinkType: filterDrinkType } = body as {
      image?: string;
      mimeType?: string;
      menuText?: string;
      maxPrice?: number | null;
      drinkType?: string | null;
    };

    if (!image && !menuText) {
      return new Response(
        JSON.stringify({ error: "Menu image or text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[scan-menu] GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Fetch user taste profile ─────────────────────────────────────────

    const { data: userDrinks } = await supabaseClient
      .from("drinks")
      .select("name, type, rating, brand")
      .eq("user_id", userId)
      .order("rating", { ascending: false })
      .limit(20);

    const drinks = (userDrinks || []) as DrinkRow[];
    const tasteContext = buildTasteContext(drinks);
    const drinkCount = drinks.length;
    const tasteProfileUsed = drinkCount >= 5;

    // ── Fetch network signal ─────────────────────────────────────────────

    // Get IDs of users this person follows
    const { data: followRows } = await supabaseClient
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .eq("status", "accepted");

    const followingIds = (followRows || []).map(
      (r: { following_id: string }) => r.following_id
    );

    let networkContext = "";
    if (followingIds.length > 0) {
      // Fetch drinks from followed users, aggregated
      const { data: networkRows } = await supabaseClient.rpc(
        "get_network_top_drinks",
        { follower_ids: followingIds, min_ratings: 2, max_results: 15 }
      );

      // Fallback: if RPC doesn't exist, just skip network context
      if (networkRows && Array.isArray(networkRows)) {
        networkContext = buildNetworkContext(networkRows);
      } else {
        // Direct query fallback
        const { data: friendDrinks } = await supabaseClient
          .from("drinks")
          .select("name, type, rating")
          .in("user_id", followingIds);

        if (friendDrinks && friendDrinks.length > 0) {
          // Aggregate manually
          const agg: Record<
            string,
            { name: string; type: string; total: number; count: number }
          > = {};
          for (const d of friendDrinks) {
            const key = d.name.toLowerCase();
            if (!agg[key]) {
              agg[key] = { name: d.name, type: d.type, total: 0, count: 0 };
            }
            agg[key].total += d.rating;
            agg[key].count += 1;
          }
          const filtered = Object.values(agg)
            .filter((d) => d.count >= 2)
            .map((d) => ({
              name: d.name,
              type: d.type,
              avg_rating: d.total / d.count,
              count: d.count,
            }))
            .sort((a, b) => b.avg_rating - a.avg_rating)
            .slice(0, 15);

          networkContext = buildNetworkContext(filtered);
        }
      }
    }

    // ── Build constraint block ───────────────────────────────────────────

    let constraintBlock = "";
    const constraints: string[] = [];

    if (typeof maxPrice === "number" && maxPrice > 0) {
      constraints.push(
        `Only recommend drinks priced at $${maxPrice} or under. Do not include any drink above this price in your recommendations, even if it matches the taste profile well. If fewer than 5 drinks fall under this price, return only those that qualify.`
      );
    }

    if (
      typeof filterDrinkType === "string" &&
      filterDrinkType.trim().length > 0
    ) {
      constraints.push(
        `Only recommend drinks of type: ${filterDrinkType}. Ignore all other drink types on the menu entirely.`
      );
    }

    if (constraints.length > 0) {
      constraintBlock = `\n\n--- HARD CONSTRAINTS (MUST FOLLOW) ---\n${constraints
        .map((c, i) => `${i + 1}. ${c}`)
        .join("\n")}`;
    }

    // ── Build Gemini prompt ──────────────────────────────────────────────

    const systemPrompt = `You are an expert sommelier and beverage consultant. You will be given a drink menu (either as an image or text) and optionally a user's taste profile and network recommendations.

Your job is to:
1. Extract all drinks from the menu
2. Rank them as recommendations based on the user's taste profile if provided, otherwise rank by general quality and popularity
3. Return a structured JSON response

Return ONLY a JSON object with:
- drinks: array of extracted menu items, each with { name, type, price } (type must be one of: whiskey, beer, wine, cocktail, other; price is a string or null if not visible)
- recommendations: top 5 ranked recommendations, each with:
  - name: drink name exactly as it appears on the menu
  - rank: 1-5
  - reason: 2-3 sentence personalized explanation referencing their taste profile if available
  - matchScore: "high" | "medium" | "low" personal match rating
  - networkRating: average rating from their network if available (null otherwise)
- tasteProfileUsed: boolean — whether personalization was applied
- drinkCount: integer — number of drinks in the user's log used for personalization
- generalNote: one sentence caveat if no taste profile was available (null otherwise)${tasteContext}${networkContext}${constraintBlock}`;

    const userParts: Array<Record<string, unknown>> = [];

    if (image) {
      userParts.push({
        text: "Please analyze this drink menu and provide recommendations.",
      });
      userParts.push({
        inlineData: { mimeType: mimeType ?? "image/jpeg", data: image },
      });
    } else {
      userParts.push({
        text: `Please analyze this drink menu and provide recommendations:\n\n${menuText}`,
      });
    }

    console.log(
      `[scan-menu] Calling Gemini — hasImage: ${!!image}, mimeType: ${mimeType ?? "none"}, drinkCount: ${drinkCount}, tasteProfileUsed: ${tasteProfileUsed}, networkDrinks: ${networkContext ? "yes" : "no"}, maxPrice: ${maxPrice ?? "none"}, drinkType: ${filterDrinkType ?? "none"}`
    );

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[scan-menu] Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to analyze menu" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("[scan-menu] No content in AI response");
      return new Response(
        JSON.stringify({ error: "Could not read menu. Try a clearer photo." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let menuData;
    try {
      menuData = JSON.parse(content);
    } catch {
      console.error("[scan-menu] Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse menu analysis" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Ensure tasteProfileUsed and drinkCount are in the response
    menuData.tasteProfileUsed = tasteProfileUsed;
    menuData.drinkCount = drinkCount;

    console.log(
      `[scan-menu] Success — ${menuData.drinks?.length || 0} drinks extracted, ${menuData.recommendations?.length || 0} recommendations`
    );

    return new Response(JSON.stringify({ success: true, data: menuData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[scan-menu] Error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
