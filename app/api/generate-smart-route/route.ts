import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getActiveDonations, getFoodBanks } from "@/lib/data";
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

    const candidates = nearbyDonations
      .sort((a, b) => a.approxDistKm - b.approxDistKm)
      .slice(0, 5);
    const dropoffs = nearbyFoodBanks.slice(0, 5);

    const prompt = `
    You are an expert logistics coordinator.
    Create a volunteer route using the data below.

    Volunteer Location: { lat: ${lat}, lng: ${lng} }

    Pickups: ${JSON.stringify(
      candidates.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        weightKg: d.weight,
        pickupWindow: d.pickupWindow,
        location: d.location,
        distanceFromVolunteerKm: d.approxDistKm.toFixed(1),
      }))
    )}

    Dropoffs: ${JSON.stringify(
      dropoffs.map((fb) => ({
        id: fb.uid,
        name: fb.organizationName || fb.displayName,
        capabilities: fb.storageCapabilities,
        location: fb.location,
        distanceFromVolunteerKm: fb.approxDistKm.toFixed(1),
      }))
    )}

    RETURN JSON ONLY with this structure:
    {
      "foundRoute": boolean,
      "stops": [
        {
          "type": "pickup|dropoff",
          "name": "string",
          "description": "string",
          "location": { "lat": number, "lng": number },
          "estimatedArrival": "string"
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
      model: "gemini-2.5-pro",
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

    return NextResponse.json({ route: routeData });
  } catch (error: any) {
    console.error("Smart Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate route" },
      { status: 500 }
    );
  }
}
