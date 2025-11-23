export async function getTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceText: string; durationText: string; durationValue: number } | null> {
  const apiKey = process.env.MAPS_API;
  if (!apiKey) {
    console.error("MAPS_API key is missing");
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows[0] || !data.rows[0].elements[0]) {
      console.error("Maps API error or no results", data);
      return null;
    }

    const element = data.rows[0].elements[0];
    if (element.status !== 'OK') {
       return null;
    }

    return {
      distanceText: element.distance.text,
      durationText: element.duration.text,
      durationValue: element.duration.value // seconds
    };
  } catch (error) {
    console.error("Error fetching travel time:", error);
    return null;
  }
}

