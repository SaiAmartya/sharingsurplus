export interface RouteStop {
  type: "pickup" | "dropoff";
  name: string;
  description: string;
  contactPhone?: string;
  sourceId?: string;
  location: {
    lat: number;
    lng: number;
  };
  estimatedArrival: string;
}

export interface RouteData {
  origin: {
    lat: number;
    lng: number;
  };
  stops: RouteStop[];
  totalDistance: string;
  totalTime: string;
  reasoning: string;
  foundRoute?: boolean;
  completedStops?: number;
  initialTotalStops?: number;
}

const STORAGE_KEY = "ss-active-route";

export function isValidRoute(data: unknown): data is RouteData {
  if (!data || typeof data !== "object") return false;
  const route = data as Partial<RouteData>;
  if (
    !route.origin ||
    typeof route.origin !== "object" ||
    typeof route.origin.lat !== "number" ||
    typeof route.origin.lng !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(route.stops) || route.stops.length === 0) return false;
  const stopsValid = route.stops.every((stop) => {
    if (!stop || typeof stop !== "object") return false;
    if (stop.type !== "pickup" && stop.type !== "dropoff") return false;
    if (typeof stop.name !== "string" || typeof stop.description !== "string") {
      return false;
    }
    if (!stop.location || typeof stop.location !== "object") return false;
    const { lat, lng } = stop.location as { lat?: unknown; lng?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number") return false;
    if (typeof stop.estimatedArrival !== "string") return false;
    if (stop.contactPhone && typeof stop.contactPhone !== "string") return false;
    if (stop.sourceId && typeof stop.sourceId !== "string") return false;
    return true;
  });

  const stringsPresent =
    typeof route.totalDistance === "string" &&
    typeof route.totalTime === "string" &&
    typeof route.reasoning === "string";

  return stopsValid && stringsPresent;
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function persistRoute(route: RouteData) {
  if (!hasSessionStorage()) return;
  if (!isValidRoute(route)) {
    console.warn("Attempted to persist invalid route");
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(route));
  } catch (error) {
    console.error("Failed to persist active route", error);
  }
}

export function loadPersistedRoute(): RouteData | null {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Allow route without contactPhone or sourceId for now to prevent clearing valid data during dev
    // We can make strict validation optional or check core fields only
    if (isValidRoute(parsed)) {
      return parsed;
    }
    // If invalid, we clear it.
    // console.warn("Invalid route data found in storage, clearing.", parsed);
    clearPersistedRoute();
    return null;
  } catch (error) {
    console.error("Failed to read active route", error);
    return null;
  }
}

export function clearPersistedRoute() {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear active route", error);
  }
}

export function getPrimaryStop(route: RouteData): RouteStop | null {
  return route.stops?.[0] ?? null;
}
