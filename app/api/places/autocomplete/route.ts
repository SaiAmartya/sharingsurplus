import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");

  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.MAPS_API;
  
  // Debug logging
  if (!apiKey) {
    console.error("❌ MAPS_API is missing from server environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // Using the new Places API (New) endpoint
    const response = await fetch(
      `https://places.googleapis.com/v1/places:autocomplete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: input,
          includeQueryPredictions: false,
          includedPrimaryTypes: ["street_address", "subpremise", "premise"],
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ Google Maps API Error:", data.error.message);
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }
    
    // Transform new API response format to match old format for frontend compatibility
    const predictions = data.suggestions?.map((s: any) => {
      const place = s.placePrediction;
      return {
        place_id: place.placeId,
        description: place.text.text,
        structured_formatting: {
          main_text: place.structuredFormat?.mainText?.text || place.text.text,
          secondary_text: place.structuredFormat?.secondaryText?.text || ""
        }
      };
    }) || [];

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("❌ Autocomplete Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
