import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://barkeeply.lovable.app",
  "https://preview--barkeeply.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

// Valid drink types
const VALID_DRINK_TYPES = ["whiskey", "beer", "wine", "cocktail", "other"];

// Input validation limits
const MAX_DRINK_NAME_LENGTH = 200;
const MAX_BRAND_LENGTH = 100;
const MAX_URL_LENGTH = 500;

// Supabase storage URL prefix for validation
const SUPABASE_STORAGE_PREFIX = "https://kvsfwvxlmrtbzafznczd.supabase.co/storage/";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  
  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  
  // For non-allowed origins, return restrictive headers
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function sanitizeInput(str: string): string {
  return str.trim().replace(/[<>]/g, "");
}

function validateRequest(body: unknown): { 
  valid: boolean; 
  error?: string; 
  data?: { drinkName?: string; drinkType?: string; brand?: string; imageUrl?: string } 
} {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Invalid request body" };
  }

  const { drinkName, drinkType, brand, imageUrl } = body as Record<string, unknown>;

  // Validate drinkName
  if (drinkName !== undefined) {
    if (typeof drinkName !== "string") {
      return { valid: false, error: "drinkName must be a string" };
    }
    if (drinkName.length > MAX_DRINK_NAME_LENGTH) {
      return { valid: false, error: `drinkName must be less than ${MAX_DRINK_NAME_LENGTH} characters` };
    }
  }

  // Validate drinkType
  if (drinkType !== undefined) {
    if (typeof drinkType !== "string") {
      return { valid: false, error: "drinkType must be a string" };
    }
    if (!VALID_DRINK_TYPES.includes(drinkType)) {
      return { valid: false, error: `drinkType must be one of: ${VALID_DRINK_TYPES.join(", ")}` };
    }
  }

  // Validate brand
  if (brand !== undefined) {
    if (typeof brand !== "string") {
      return { valid: false, error: "brand must be a string" };
    }
    if (brand.length > MAX_BRAND_LENGTH) {
      return { valid: false, error: `brand must be less than ${MAX_BRAND_LENGTH} characters` };
    }
  }

  // Validate imageUrl
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== "string") {
      return { valid: false, error: "imageUrl must be a string" };
    }
    if (imageUrl.length > MAX_URL_LENGTH) {
      return { valid: false, error: `imageUrl must be less than ${MAX_URL_LENGTH} characters` };
    }
    // Only allow Supabase storage URLs to prevent SSRF
    if (!imageUrl.startsWith(SUPABASE_STORAGE_PREFIX)) {
      return { valid: false, error: "imageUrl must be from Supabase storage" };
    }
    try {
      new URL(imageUrl);
    } catch {
      return { valid: false, error: "imageUrl must be a valid URL" };
    }
  }

  return {
    valid: true,
    data: {
      drinkName: drinkName ? sanitizeInput(drinkName as string) : undefined,
      drinkType: drinkType as string | undefined,
      brand: brand ? sanitizeInput(brand as string) : undefined,
      imageUrl: imageUrl as string | undefined,
    },
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const body = await req.json();
    
    // Validate and sanitize input
    const validation = validateRequest(body);
    if (!validation.valid) {
      console.error("Validation error:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { drinkName, drinkType, brand, imageUrl } = validation.data!;
    
    // Allow lookup by name OR image
    if (!drinkName && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Drink name or image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQuery = brand ? `${brand} ${drinkName}` : drinkName;
    const typeContext = drinkType ? `This is a ${drinkType}.` : "";

    console.log(`Looking up drink: ${searchQuery || 'from image'}, type: ${drinkType}, hasImage: ${!!imageUrl}`);

    const systemPrompt = `You are a knowledgeable beverage expert and sommelier. When given a drink name or image, identify it and provide accurate and helpful information about it. Be concise but informative. If you're not certain about specific details, indicate that.

Return your response as a JSON object with these fields:
- drinkName: The identified name of the drink (only include if identifying from an image)
- drinkBrand: The identified brand/producer (only include if identifying from an image)  
- drinkType: The type of drink - must be one of: whiskey, beer, wine, cocktail, other (only include if identifying from an image)
- tastingNotes: A brief description of flavor profile, aromas, and characteristics (2-3 sentences max)
- brandInfo: Information about the producer/brand, origin, and any notable background (2-3 sentences max)
- priceRange: Typical price range (e.g., "$30-50 per bottle" or "$8-15 per glass")
- suggestions: Any serving suggestions, food pairings, or similar drinks to try (1-2 sentences)

If you don't have reliable information for a field, set it to null.`;

    // Build messages based on whether we have an image
    const userContent = imageUrl 
      ? [
          { type: "text", text: `Please identify this drink from the image and provide information about it.${typeContext ? ` Context: ${typeContext}` : ''}${drinkName ? ` The user thinks it might be "${searchQuery}".` : ''}` },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      : `Please provide information about this drink: "${searchQuery}". ${typeContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to lookup drink information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No information found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let drinkInfo;
    try {
      drinkInfo = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse drink information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Drink lookup successful:", drinkInfo);

    return new Response(
      JSON.stringify({ success: true, data: drinkInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lookup error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
