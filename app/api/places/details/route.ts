import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");

  if (!placeId) {
    return NextResponse.json({ error: "Missing place_id" }, { status: 400 });
  }

  const apiKey = process.env.MAPS_API;
  if (!apiKey) {
    console.error("❌ MAPS_API is missing from server environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // Using the new Places API (New) endpoint
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=location,formattedAddress`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ Google Maps Details API Error:", data.error.message);
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    // Transform to match old format
    return NextResponse.json({
      result: {
        geometry: {
          location: {
            lat: data.location.latitude,
            lng: data.location.longitude
          }
        },
        formatted_address: data.formattedAddress
      }
    });
  } catch (error) {
    console.error("❌ Details Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}
