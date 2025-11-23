"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface RouteStop {
  type: 'pickup' | 'dropoff';
  name: string;
  description: string;
  location: { lat: number; lng: number };
  estimatedArrival: string;
}

interface RouteData {
  stops: RouteStop[];
  totalDistance: string;
  totalTime: string;
  reasoning: string;
  foundRoute?: boolean;
}

export default function VolunteerRoutes() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        // Default location (Ottawa) if geolocation fails or is denied
        let lat = 45.4215;
        let lng = -75.6972;

        // Try to get real location
        if (navigator.geolocation) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                lat = position.coords.latitude;
                lng = position.coords.longitude;
            } catch (e) {
                console.log("Using default location");
            }
        }

        const response = await fetch('/api/generate-smart-route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng, volunteerId: 'current-user' })
        });

        const data = await response.json();

        if (data.route) {
            setRoute(data.route);
        } else {
            // Fallback or empty state
             if (data.message) setError(data.message);
        }
      } catch (err) {
        console.error(err);
        setError("Could not generate optimized route.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, []);

  return (
    <div className="pt-12 px-6 pb-10 max-w-lg mx-auto">
       {/* Header */}
       <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="font-display text-3xl font-bold text-nb-teal flex items-center">
                    Online <span className="ml-2 w-3 h-3 bg-nb-teal rounded-full animate-pulse"></span>
                </h2>
            </div>
            {/* Geometric Toggle */}
            <div className="w-16 h-9 bg-nb-teal-soft rounded-full relative cursor-pointer transition-colors">
                <div className="w-7 h-7 bg-nb-teal rounded-full absolute top-1 right-1 shadow-sm"></div>
            </div>
        </div>

        <h3 className="font-display text-xl font-bold mb-5 text-nb-ink">Smart Routes <span className="text-slate-400 text-sm font-sans font-normal ml-2">(AI Optimized)</span></h3>

        {loading ? (
             <div className="bg-white rounded-[2rem] shadow-soft p-6 mb-6 animate-pulse border border-slate-100">
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-8"></div>
                <div className="space-y-8 pl-4 border-l-2 border-slate-100 ml-2">
                    <div className="h-12 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-12 bg-slate-200 rounded w-3/4"></div>
                </div>
                <div className="mt-8 h-14 bg-slate-200 rounded-2xl w-full"></div>
             </div>
        ) : error ? (
            <div className="bg-white rounded-[2rem] p-6 mb-6 border border-red-100 text-center">
                <p className="text-slate-500">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 text-nb-blue font-bold text-sm">Try Again</button>
            </div>
        ) : route ? (
            route.foundRoute === false ? (
                <div className="bg-white rounded-[2rem] shadow-soft p-6 mb-6 border border-amber-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                    <h4 className="font-display font-bold text-xl text-amber-900 mb-2">No Optimal Route Found</h4>
                    <p className="text-slate-500 text-sm mb-4">{route.reasoning}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-amber-100 text-amber-800 rounded-xl font-bold text-sm hover:bg-amber-200 transition-colors">Check Again</button>
                </div>
            ) : (
            /* Dynamic Route Card */
            <div className="bg-white rounded-[2rem] shadow-soft p-6 mb-6 relative overflow-hidden border border-slate-100">
                {/* Decorative Blob */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-nb-orange-soft rounded-bl-full -mr-10 -mt-10 z-0 opacity-50"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <span className="bg-nb-ink text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm uppercase">
                            {route.totalTime || "45 MINS"}
                        </span>
                        <div className="text-right">
                            <span className="font-display font-bold text-3xl text-slate-800 leading-none">
                                {route.totalDistance ? route.totalDistance.replace(' km', '') : '15'}
                                <span className="text-base ml-1">km</span>
                            </span>
                            <div className="text-xs text-slate-400 font-bold uppercase">Total Dist</div>
                        </div>
                    </div>

                    {/* Visual Route Line */}
                    <div className="relative pl-4 border-l-2 border-slate-100 space-y-8 mb-8 ml-2">
                        {route.stops.map((stop, idx) => (
                             <div key={idx} className="relative">
                                <div className={`absolute -left-[23px] top-1 w-5 h-5 ${stop.type === 'pickup' ? 'bg-white border-4 border-nb-ink' : 'bg-nb-ink'} rounded-full ${stop.type === 'dropoff' ? 'shadow-sm' : ''}`}></div>
                                <div>
                                    <h4 className="font-bold text-nb-ink text-lg">{stop.name}</h4>
                                    <p className="text-sm text-slate-500">{stop.description}</p>
                                    <span className="text-xs text-slate-400 font-mono">{stop.estimatedArrival}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* AI Reasoning */}
                    {route.reasoning && (
                        <div className="mb-6 p-4 bg-indigo-50/50 rounded-xl text-sm text-indigo-900 border border-indigo-100">
                             <div className="flex items-center mb-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>
                                AI Logic
                             </div>
                             "{route.reasoning}"
                        </div>
                    )}

                    <Link href="/volunteer/active" className="block w-full text-center bg-nb-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-glow hover:-translate-y-1">
                        Start Route
                    </Link>
                </div>
            </div>
        )) : null}
        
        {/* Secondary Route (Dimmed) - Static for now or could be a 2nd option */}
        <div className="bg-white/60 rounded-[2rem] p-6 border border-slate-100 opacity-60 grayscale">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold">1.5 HRS</span>
                <span className="font-display font-bold text-2xl text-slate-400">Older Route</span>
            </div>
            <p className="text-slate-400 font-bold">Farm Boy -&gt; Shelter</p>
        </div>
    </div>
  );
}
