import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const center = searchParams.get("center");
  const zoom = searchParams.get("zoom") || "15";
  const size = searchParams.get("size") || "800x600";
  const markers = searchParams.get("markers");
  const maptype = searchParams.get("maptype") || "roadmap";

  const apiKey = process.env.MAPS_API;

  if (!apiKey) {
    console.error("❌ MAPS_API is missing");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Construct the Google Static Maps URL using URLSearchParams for proper encoding
  const params = new URLSearchParams();
  if (center) params.append("center", center);
  params.append("zoom", zoom);
  params.append("size", size);
  params.append("maptype", maptype);
  params.append("key", apiKey);
  
  // Add style to hide POIs for cleaner look
  params.append("style", "feature:poi|visibility:off");

  if (markers) {
    // markers param might come in already encoded or with pipes. 
    // We want to pass it to Google properly encoded.
    // If the input string uses pipes, URLSearchParams will encode them to %7C which is correct.
    params.append("markers", markers);
  }

  const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Google Maps API error:", response.status, response.statusText);
      return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Static Map Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}
