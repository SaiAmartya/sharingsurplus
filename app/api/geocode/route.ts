import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
  }

  const apiKey = process.env.MAPS_API;
  if (!apiKey) {
    console.error("❌ MAPS_API is missing from server environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error("❌ Geocoding API Error:", data.status, data.error_message);
      return NextResponse.json({ error: data.status }, { status: 400 });
    }

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return NextResponse.json({
        lat: location.lat,
        lng: location.lng,
        formattedAddress: data.results[0].formatted_address
      });
    }

    return NextResponse.json({ error: "No results found" }, { status: 404 });

  } catch (error) {
    console.error("❌ Geocode Fetch Error:", error);
    return NextResponse.json({ error: "Failed to geocode address" }, { status: 500 });
  }
}

