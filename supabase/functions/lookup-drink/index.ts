import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drinkName, drinkType, brand, imageUrl } = await req.json();
    
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
