import { NextResponse } from "next/server";

interface Coordinate {
  lat: number;
  lng: number;
  type?: "pickup" | "dropoff";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = searchParams.get("size") || "800x600";
  const originParam = searchParams.get("origin");
  const stopsParam = searchParams.get("stops");
  const styleId = searchParams.get("style") || "streets-v12";

  if (!originParam || !stopsParam) {
    return placeholderResponse("Missing origin or stops for route preview.");
  }

  const origin = parseCoordinate(originParam);
  let stops: Coordinate[] = [];

  try {
    stops = JSON.parse(stopsParam);
  } catch (error) {
    console.error("Failed to parse stops JSON", error);
    return placeholderResponse("Invalid stop data for route preview.");
  }

  if (!origin || !Array.isArray(stops) || stops.length === 0) {
    return placeholderResponse("Insufficient coordinates for map rendering.");
  }

  const sizeParts = size.split("x").map((val) => parseInt(val, 10));
  const width = Number.isFinite(sizeParts[0]) ? sizeParts[0] : 800;
  const height = Number.isFinite(sizeParts[1]) ? sizeParts[1] : 600;

  const mapboxToken = process.env.MAPBOX_TOKEN;
  if (mapboxToken) {
    return renderMapbox({
      origin,
      stops,
      width,
      height,
      styleId,
      token: mapboxToken,
    });
  }

  const googleKey = process.env.MAPS_API;
  if (googleKey) {
    return renderGoogleStatic({
      origin,
      stops,
      width,
      height,
      apiKey: googleKey,
    });
  }

  console.warn("No MAPBOX_TOKEN or MAPS_API configured for static routing previews.");
  return placeholderResponse("Static map unavailable. Set MAPBOX_TOKEN or MAPS_API.");
}

function parseCoordinate(raw: string): Coordinate | null {
  const [latStr, lngStr] = raw.split(",");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function buildPathOverlay(points: Coordinate[]) {
  const coordList = points
    .map((point) => `${point.lng},${point.lat}`)
    .join(";");
  return `path-4+111827-0.7(${coordList})`;
}

function buildMarkerOverlay(point: Coordinate, label: string, color: string) {
  return `pin-s-${label}+${color}(${point.lng},${point.lat})`;
}

function placeholderResponse(message: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="#94a3b8">
        ${message}
      </text>
    </svg>
  `;
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

async function renderMapbox({
  origin,
  stops,
  width,
  height,
  styleId,
  token,
}: {
  origin: Coordinate;
  stops: Coordinate[];
  width: number;
  height: number;
  styleId: string;
  token: string;
}) {
  const pathOverlay = buildPathOverlay([origin, ...stops]);
  const markerOverlays = [
    buildMarkerOverlay(origin, "a", "0a84ff"),
    ...stops.map((stop, idx) =>
      buildMarkerOverlay(
        stop,
        `${idx + 1}`,
        stop.type === "pickup" ? "2563eb" : "f43f5e"
      )
    ),
  ];

  const overlayPath = [pathOverlay, ...markerOverlays]
    .map((segment) => encodeURIComponent(segment))
    .join(",");

  const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${overlayPath}/auto/${width}x${height}?padding=80&access_token=${token}`;

  try {
    const response = await fetch(mapboxUrl);
    if (!response.ok) {
      console.error("Mapbox static image error:", response.status, response.statusText);
      return placeholderResponse("Map preview failed. Verify Mapbox configuration.");
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("Static Map Fetch Error:", error);
    return placeholderResponse("Map preview unavailable. Please retry.");
  }
}

async function renderGoogleStatic({
  origin,
  stops,
  width,
  height,
  apiKey,
}: {
  origin: Coordinate;
  stops: Coordinate[];
  width: number;
  height: number;
  apiKey: string;
}) {
  const markers: string[] = [
    `color:0x0a84ff|label:S|${origin.lat},${origin.lng}`,
    ...stops.map((stop, idx) => {
      const color = stop.type === "pickup" ? "0x2563eb" : "0xf43f5e";
      const label = idx + 1;
      return `color:${color}|label:${label}|${stop.lat},${stop.lng}`;
    }),
  ];

  const path = [origin, ...stops]
    .map((point) => `${point.lat},${point.lng}`)
    .join("|");

  const params = new URLSearchParams();
  params.append("size", `${width}x${height}`);
  params.append("maptype", "roadmap");
  params.append("key", apiKey);
  params.append("path", `weight:4|color:0x111827|${path}`);
  markers.forEach((marker) => params.append("markers", marker));
  params.append("style", "feature:poi|visibility:off");

  const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Google static map error:", response.status, response.statusText);
      return placeholderResponse("Map preview failed. Verify MAPS_API configuration.");
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (error) {
    console.error("Google Static Map Fetch Error:", error);
    return placeholderResponse("Map preview unavailable. Please retry.");
  }
}
