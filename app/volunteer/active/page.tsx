"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  RouteData,
  RouteStop,
  loadPersistedRoute,
  clearPersistedRoute,
  persistRoute,
  getPrimaryStop,
} from "@/lib/route-storage";

export default function ActiveDelivery() {
  const [status, setStatus] = useState<"navigating" | "arrived" | "completed">("navigating");
  const [weight, setWeight] = useState("");
  const [spoilageChecked, setSpoilageChecked] = useState(false);
  const [expiryChecked, setExpiryChecked] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [activeStop, setActiveStop] = useState<RouteStop | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    const storedRoute = loadPersistedRoute();
    if (storedRoute && storedRoute.foundRoute !== false) {
      // Initialize completedStops and initialTotalStops if they don't exist
      if (typeof storedRoute.completedStops === 'undefined') {
        storedRoute.completedStops = 0;
        storedRoute.initialTotalStops = storedRoute.stops.length;
        persistRoute(storedRoute);
      }
      
      setRoute(storedRoute);
      setActiveStop(getPrimaryStop(storedRoute));
    } else {
      setRouteError(
        "Active route not found. Return to the dashboard to generate a Smart Route."
      );
      clearPersistedRoute();
    }
    setRouteLoading(false);
  }, []);

  const handleComplete = async () => {
    if (!route || !activeStop) return;

    // Delete the donation if it's a pickup and has a sourceId
    if (activeStop.type === "pickup" && activeStop.sourceId) {
        try {
            await deleteDoc(doc(db, "donations", activeStop.sourceId));
            console.log("Deleted donation:", activeStop.sourceId);
        } catch (err) {
            console.error("Failed to delete donation:", err);
        }
    }

    // Remove the completed stop and check for next one
    const nextStops = route.stops.slice(1);

    if (nextStops.length > 0) {
      // Progress to next stop
      const updatedRoute = { 
        ...route, 
        stops: nextStops,
        completedStops: (route.completedStops || 0) + 1,
        initialTotalStops: route.initialTotalStops || (route.stops.length + (route.completedStops || 0))
      };
      setRoute(updatedRoute);
      setActiveStop(nextStops[0]);
      persistRoute(updatedRoute);

      // Reset form state
      setWeight("");
      setSpoilageChecked(false);
      setExpiryChecked(false);
      setStatus("navigating");
      window.scrollTo(0, 0);
    } else {
      // All stops done
      setStatus("completed");
      clearPersistedRoute();
    }
  };

  const handleSkip = () => {
    if (!route) return;

    // Remove current stop without validating
    const nextStops = route.stops.slice(1);

    if (nextStops.length > 0) {
        const updatedRoute = { 
            ...route, 
            stops: nextStops,
            completedStops: (route.completedStops || 0) + 1,
            initialTotalStops: route.initialTotalStops || (route.stops.length + (route.completedStops || 0))
        };
        setRoute(updatedRoute);
        setActiveStop(nextStops[0]);
        persistRoute(updatedRoute);
        
        // Reset UI state
        setStatus("navigating");
        window.scrollTo(0, 0);
    } else {
        // If skipping the last stop, just complete the route
        setStatus("completed");
        clearPersistedRoute();
    }
  };

  if (routeLoading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading your active route...</p>
      </div>
    );
  }

  if (routeError || !route || !activeStop) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full border border-slate-100">
          <h2 className="font-display text-2xl font-bold text-nb-ink mb-3">No Active Route</h2>
          <p className="text-slate-500 mb-6">
            {routeError ?? "We couldn't load your stop details. Please start a route from the dashboard."}
          </p>
          <Link
            href="/volunteer"
            className="block w-full py-4 bg-nb-blue text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ActiveRouteContent 
        route={route}
        activeStop={activeStop}
        status={status}
        setStatus={setStatus}
        weight={weight}
        setWeight={setWeight}
        spoilageChecked={spoilageChecked}
        setSpoilageChecked={setSpoilageChecked}
        expiryChecked={expiryChecked}
        setExpiryChecked={setExpiryChecked}
        handleComplete={handleComplete}
        handleSkip={handleSkip}
    />
  );
}

function ActiveRouteContent({
    route,
    activeStop,
    status,
    setStatus,
    weight,
    setWeight,
    spoilageChecked,
    setSpoilageChecked,
    expiryChecked,
    setExpiryChecked,
    handleComplete,
    handleSkip
}: {
    route: RouteData;
    activeStop: RouteStop;
    status: "navigating" | "arrived" | "completed";
    setStatus: (s: "navigating" | "arrived" | "completed") => void;
    weight: string;
    setWeight: (w: string) => void;
    spoilageChecked: boolean;
    setSpoilageChecked: (c: boolean) => void;
    expiryChecked: boolean;
    setExpiryChecked: (c: boolean) => void;
    handleComplete: () => void;
    handleSkip: () => void;
}) {
  // Moved useMemo call inside the new component to ensure consistent hook execution
  const mapUrl = useMemo(() => {
    try {
      const originParam = encodeURIComponent(
        `${route.origin.lat},${route.origin.lng}`
      );
      const stopsPayload = encodeURIComponent(
        JSON.stringify(
          route.stops.map((stop) => ({
            lat: stop.location.lat,
            lng: stop.location.lng,
            type: stop.type,
          }))
        )
      );
      return `/api/maps/static?origin=${originParam}&stops=${stopsPayload}&size=1200x900`;
    } catch (error) {
      console.error("Failed to build static map URL", error);
      return null;
    }
  }, [route]);
  
  const stopLabel = activeStop.type === "pickup" ? "Pickup" : "Dropoff";
  const contactPhone = activeStop.contactPhone;

  if (status === "completed") {
    return (
      <div className="h-screen bg-nb-bg flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            <i className="fas fa-check"></i>
          </div>
          <h2 className="font-display text-2xl font-bold text-nb-ink mb-2">Stop Complete!</h2>
          <p className="text-slate-500 mb-8">
            Thank you for finishing the {stopLabel.toLowerCase()} at {activeStop.name}. Return to the dashboard for your next assignment.
          </p>
          <Link
            href="/volunteer"
            className="block w-full py-4 bg-nb-ink text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Map Section - Full height on desktop, top half on mobile */}
      <div className="relative w-full md:w-1/2 h-[35vh] md:h-screen bg-slate-200 order-1 md:order-2 overflow-hidden shrink-0">
        {/* Map Image */}
        <div className="absolute inset-0 w-full h-full bg-slate-200">
          {mapUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapUrl}
              alt="Static map preview of your route"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm text-center px-6">
              Map preview unavailable. Please ensure routing data is loaded.
            </div>
          )}
        </div>

        {/* Overlay Controls */}
        <Link
          href="/volunteer"
          className="absolute top-6 left-6 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 text-nb-ink transition-transform hover:scale-105"
        >
          <i className="fas fa-arrow-left"></i>
        </Link>

        {/* Destination Pill */}
        <div className="absolute top-20 left-6 right-6 md:top-auto md:bottom-6 md:left-auto md:right-6 md:w-80 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nb-blue/10 text-nb-blue rounded-full flex items-center justify-center shrink-0">
              <i className="fas fa-location-dot text-lg"></i>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stopLabel}</p>
              <p className="font-bold text-nb-ink">{activeStop.name}</p>
              {/* Description removed */}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col bg-white order-2 md:order-1 md:h-screen md:overflow-y-auto relative z-10 -mt-8 md:mt-0 rounded-t-[2.5rem] md:rounded-none shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none">
        <div className="p-6 md:p-12 max-w-2xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nb-blue/10 text-nb-blue text-sm font-bold mb-4">
              <span className="w-2 h-2 rounded-full bg-nb-blue animate-pulse"></span>
              Active Stop
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-nb-ink mb-2">
              {status === "navigating" ? "Head to Stop" : "Stop Details"}
            </h1>
            <p className="text-slate-500 text-base md:text-lg">
              {status === "navigating"
                ? `Navigate to ${activeStop.name} to begin the ${stopLabel.toLowerCase()}.`
                : "Verify the items and capture the pickup details."}
            </p>
          </div>

          {/* Task Info Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-nb-ink">
                  Stop {(route.completedStops || 0) + 1} of {route.initialTotalStops || (route.stops.length + (route.completedStops || 0))}
                </h3>
                <p className="text-slate-500">{activeStop.name}</p>
              </div>
              <span className="text-xs font-bold uppercase text-slate-400">ETA {activeStop.estimatedArrival}</span>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 mb-4">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Contact Phone</p>
                <p className="font-semibold text-nb-ink">
                  {contactPhone ?? "Unavailable"}
                </p>
              </div>
              {contactPhone ? (
                <a
                  href={`tel:${contactPhone}`}
                  className="w-10 h-10 rounded-full bg-nb-blue/10 text-nb-blue flex items-center justify-center hover:bg-nb-blue hover:text-white transition-colors"
                  aria-label={`Call ${activeStop.name}`}
                >
                  <i className="fas fa-phone" />
                </a>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center">
                  <i className="fas fa-phone-slash" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Type</p>
                <p className="font-semibold text-nb-ink">{stopLabel}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Est. Arrival</p>
                <p className="font-semibold text-nb-ink">{activeStop.estimatedArrival}</p>
              </div>
            </div>
          </div>

          {status === "navigating" ? (
            <div className="mt-auto">
              <button
                onClick={() => setStatus("arrived")}
                className="w-full py-4 bg-nb-ink text-white rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <span>I've Arrived</span>
                <i className="fas fa-arrow-right"></i>
              </button>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <button 
                  onClick={handleSkip}
                  className="py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Skip Stop
                </button>
                <button className="py-3 rounded-xl border border-slate-200 text-nb-red font-bold hover:bg-red-50 hover:border-red-100 transition-colors">
                  Report Issue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeStop.type === "pickup" ? (
                <>
                  {/* Pickup Form */}
                  <div>
                    <label className="block text-sm font-bold text-nb-ink mb-2">Recorded Weight (kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nb-blue/20 focus:border-nb-blue transition-all font-bold text-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">kg</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Approximate weight is fine.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-nb-ink">Quality Checks</label>

                    <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={spoilageChecked}
                        onChange={(e) => setSpoilageChecked(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-nb-blue focus:ring-nb-blue"
                      />
                      <div>
                        <span className="font-bold text-nb-ink block">Spoilage Check</span>
                        <span className="text-xs text-slate-500">Fresh items are free of mold/rot</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={expiryChecked}
                        onChange={(e) => setExpiryChecked(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-nb-blue focus:ring-nb-blue"
                      />
                      <div>
                        <span className="font-bold text-nb-ink block">Expiry Check</span>
                        <span className="text-xs text-slate-500">Non-perishables are within date</span>
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-100 text-center mb-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i className="fas fa-box-open"></i>
                  </div>
                  <h3 className="font-bold text-green-900 text-lg mb-2">Ready to Drop Off</h3>
                  <p className="text-green-700 text-sm">
                    Deliver the items to {activeStop.name}. No further checks required.
                  </p>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleComplete}
                  disabled={activeStop.type === "pickup" && (!weight || !spoilageChecked || !expiryChecked)}
                  className="w-full py-4 bg-nb-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Confirm {stopLabel}</span>
                  <i className="fas fa-check"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
