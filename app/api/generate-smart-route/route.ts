import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getActiveDonations, getFoodBanks, getUserProfilesByIds } from "@/lib/data";
import { getDistanceFromLatLonInKm } from "@/lib/location";

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Missing location" }, { status: 400 });
    }

    const [donations, foodbanks] = await Promise.all([
      getActiveDonations(),
      getFoodBanks(),
    ]);

    const MAX_RADIUS_KM = 20;

    const donationsWithLocation = donations.filter(
      (d): d is typeof d & { location: NonNullable<typeof d.location> } =>
        !!d.location
    );
    const foodbanksWithLocation = foodbanks.filter(
      (fb): fb is typeof fb & { location: NonNullable<typeof fb.location> } =>
        !!fb.location
    );

    const nearbyDonations = donationsWithLocation
      .filter((d) => {
        const dist = getDistanceFromLatLonInKm(
          lat,
          lng,
          d.location.lat,
          d.location.lng
        );
        return dist <= MAX_RADIUS_KM;
      })
      .map((d) => ({
        ...d,
        approxDistKm: getDistanceFromLatLonInKm(
          lat,
          lng,
          d.location.lat,
          d.location.lng
        ),
      }));

    const nearbyFoodBanks = foodbanksWithLocation
      .filter((fb) => {
        const dist = getDistanceFromLatLonInKm(
          lat,
          lng,
          fb.location.lat,
          fb.location.lng
        );
        return dist <= MAX_RADIUS_KM + 10;
      })
      .map((fb) => ({
        ...fb,
        approxDistKm: getDistanceFromLatLonInKm(
          lat,
          lng,
          fb.location.lat,
          fb.location.lng
        ),
      }));

    if (nearbyDonations.length === 0) {
      return NextResponse.json({
        route: null,
        message: "No donations found nearby.",
      });
    }

    const donorProfiles = await getUserProfilesByIds(
      Array.from(new Set(nearbyDonations.map((d) => d.donorId)))
    );

    type CandidatePickup = (typeof nearbyDonations)[number] & {
      contactPhone?: string;
    };
    type CandidateDropoff = (typeof nearbyFoodBanks)[number] & {
      contactPhone?: string;
    };

    const candidates: CandidatePickup[] = nearbyDonations
      .sort((a, b) => a.approxDistKm - b.approxDistKm)
      .slice(0, 5)
      .map((d) => ({
        ...d,
        contactPhone: donorProfiles[d.donorId]?.phoneNumber,
      }));

    const dropoffs: CandidateDropoff[] = nearbyFoodBanks.slice(0, 5).map((fb) => ({
      ...fb,
      contactPhone: fb.phoneNumber,
    }));

    const prompt = `
    <persona>
    You are an expert logistics coordinator specializing in coordinating food distribution routes for volunteers.
    </persona>

    <guidelines>
    - The route should be optimized for applicability to the volunteer's vehicle, location, needs of food banks, etc.
    - Logic explanations must be very concise and to the point. 
    - Communicate estimated total time and other properties like "~45 minutes" or "~1 hour" in a very concise manner.
    - Solely one food bank can have items delivered (always indicates the end of a route). 
    - Never include donation post ID's in the descriptions.
    </guidelines>


    Volunteer Location (origin): { lat: ${lat}, lng: ${lng} }

    Pickups: ${JSON.stringify(
      candidates.map((d) => ({
        id: d.id,
        sourceId: d.id,
        title: d.title,
        description: d.description,
        weightKg: d.weight,
        pickupWindow: d.pickupWindow,
        location: d.location,
        distanceFromVolunteerKm: d.approxDistKm.toFixed(1),
        contactPhone: d.contactPhone || "N/A",
      }))
    )}

    Dropoffs: ${JSON.stringify(
      dropoffs.map((fb) => ({
        id: fb.uid,
        sourceId: fb.uid,
        name: fb.organizationName || fb.displayName,
        capabilities: fb.storageCapabilities,
        location: fb.location,
        distanceFromVolunteerKm: fb.approxDistKm.toFixed(1),
        contactPhone: fb.contactPhone || "N/A",
      }))
    )}

    RETURN JSON ONLY with this structure:
    {
      "origin": { "lat": number, "lng": number },
      "foundRoute": boolean,
      "stops": [
        {
          "type": "pickup|dropoff",
          "name": "string",
          "description": "string",
          "location": { "lat": number, "lng": number },
          "estimatedArrival": "string",
          "contactPhone": "string",
          "sourceId": "string"
        }
      ],
      "totalDistance": "string",
      "totalTime": "string",
      "reasoning": "string"
    }

    If you cannot build a logical route, set "foundRoute": false and explain why in "reasoning".
    `;

    const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const candidateParts =
      response.candidates?.[0]?.content?.parts ?? [];
    const responseText = candidateParts
      .map((part: any) => part.text ?? "")
      .join("")
      .trim();

    if (!responseText) {
      throw new Error("AI did not return any text response");
    }

    console.log("--- AI OUTPUT ---", responseText);

    const cleanText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const routeData = JSON.parse(cleanText);

    const normalizedStops = Array.isArray(routeData.stops)
      ? routeData.stops.map((stop: any) => {
          const lookup =
            stop.type === "pickup"
              ? findMatchingEntity(stop, candidates)
              : findMatchingEntity(stop, dropoffs);

          return {
            ...stop,
            contactPhone:
              stop.contactPhone ||
              lookup?.contactPhone ||
              undefined,
            sourceId:
              stop.sourceId ||
              lookup?.id ||
              lookup?.uid ||
              undefined,
          };
        })
      : [];

    const normalizedRoute = {
      ...routeData,
      origin: routeData.origin ?? { lat, lng },
      stops: normalizedStops,
    };

    return NextResponse.json({ route: normalizedRoute });
  } catch (error: any) {
    console.error("Smart Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate route" },
      { status: 500 }
    );
  }
}

type Point = { location: { lat: number; lng: number }; contactPhone?: string; id?: string; uid?: string };

function findMatchingEntity(
  stop: { location?: { lat: number; lng: number } },
  entities: Point[]
) {
  if (!stop.location) return null;
  const { lat, lng } = stop.location;
  return (
    entities.find((entity) => isClose(entity.location, { lat, lng })) ?? null
  );
}

function isClose(
  a?: { lat: number; lng: number },
  b?: { lat: number; lng: number }
) {
  if (!a || !b) return false;
  const threshold = 0.0005; // ~50m
  return Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;
}
