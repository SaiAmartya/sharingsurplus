"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Donation } from "@/types/schema";
import DonationDetailsModal from "@/app/components/DonationDetailsModal";
import { RouteData, persistRoute, clearPersistedRoute } from "@/lib/route-storage";

export default function VolunteerRoutes() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  const router = useRouter();

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
            setError(null);
            if (data.route.foundRoute === false) {
                clearPersistedRoute();
            } else {
                persistRoute(data.route);
            }
        } else {
            setRoute(null);
            clearPersistedRoute();
            if (data.message) setError(data.message);
        }
      } catch (err) {
        console.error(err);
        setError("Could not generate optimized route.");
        clearPersistedRoute();
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, []);

  const fetchDonations = async () => {
    setDonationsLoading(true);
    try {
      // Simple query to avoid index requirements
      const q = query(
        collection(db, "donations"),
        where("status", "==", "available")
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedDonations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Donation));

      // Sort client-side
      fetchedDonations.sort((a, b) => {
          const dateA = a.createdAt?.toMillis() || 0;
          const dateB = b.createdAt?.toMillis() || 0;
          return dateB - dateA;
      });

      setDonations(fetchedDonations);
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setDonationsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleStartRoute = () => {
    if (!route || route.foundRoute === false) return;
    persistRoute(route);
    router.push("/volunteer/active");
  };

  const handleSeedData = async () => {
    try {
        const dummyDonation = {
            donorId: "test-donor-id",
            title: "Surplus Bakery Items",
            description: "Assorted breads and pastries from the day.",
            weight: 5,
            weightUnit: "kg",
            expiryDate: Timestamp.fromDate(new Date(Date.now() + 86400000)), // 24h from now
            pickupWindow: "Today 4-6pm",
            status: "available",
            createdAt: Timestamp.now(),
            location: {
                lat: 43.6532,
                lng: -79.3832,
                address: "123 Bakery Lane, Toronto"
            }
        };
        
        await addDoc(collection(db, "donations"), dummyDonation);
        // Refresh list
        fetchDonations();
    } catch (error) {
        console.error("Error seeding data:", error);
        alert("Failed to seed data. Check console.");
    }
  };
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

        {routeLoading ? (
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
                             <div key={`${stop.name}-${idx}`} className="relative space-y-1">
                                <div className={`absolute -left-[27px] top-1 w-5 h-5 ${stop.type === 'pickup' ? 'bg-white border-4 border-nb-ink' : 'bg-nb-ink'} rounded-full ${stop.type === 'dropoff' ? 'shadow-sm' : ''}`}></div>
                                <div>
                                    <h4 className="font-bold text-nb-ink text-lg">{stop.name}</h4>
                                    {/* Description removed as requested */}
                                    <span className="text-xs text-slate-400 font-mono">{stop.estimatedArrival}</span>
                                    <div className="flex items-center gap-2 text-xs font-bold mt-1">
                                        <span className="text-slate-400 uppercase tracking-wide">Contact</span>
                                        {stop.contactPhone ? (
                                            <a
                                                href={`tel:${stop.contactPhone}`}
                                                className="text-nb-blue flex items-center gap-1"
                                                aria-label={`Call contact for ${stop.name}`}
                                            >
                                                <i className="fas fa-phone" />
                                                {stop.contactPhone}
                                            </a>
                                        ) : (
                                            <span className="text-slate-300">Unavailable</span>
                                        )}
                                    </div>
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

                    <button
                        type="button"
                        onClick={handleStartRoute}
                        className="w-full text-center bg-nb-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-glow hover:-translate-y-1"
                    >
                        Start Route
                    </button>
                </div>
            </div>
        )) : null}
        
        {/* Secondary Route (Dimmed) - Static for now or could be a 2nd option */}
        <div className="bg-white/60 rounded-[2rem] p-6 border border-slate-100 opacity-60 mb-8">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold">1.5 HRS</span>
                <span className="font-display font-bold text-2xl text-slate-400">Older Route</span>
            </div>
            <p className="text-slate-400 font-bold">Farm Boy -&gt; Shelter</p>
        </div>

        {/* Available Donations List */}
        <h3 className="font-display text-xl font-bold mb-5 text-nb-ink">Available Donations</h3>
        <div className="space-y-4">
            {donationsLoading ? (
                <p className="text-slate-500 text-center py-4">Loading donations...</p>
            ) : donations.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-slate-500 mb-4">No available donations at the moment.</p>
                    <button 
                        onClick={handleSeedData}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors"
                    >
                        Seed Test Donation
                    </button>
                </div>
            ) : (
                donations.map((donation) => (
                    <div 
                        key={donation.id} 
                        onClick={() => setSelectedDonation(donation)}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-nb-ink text-lg">{donation.title}</h4>
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">
                                {donation.weight} {donation.weightUnit}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mb-3 line-clamp-2">{donation.description}</p>
                        <div className="flex items-center text-xs text-slate-400 font-bold uppercase tracking-wide">
                            <span className="mr-2"><i className="fas fa-map-marker-alt"></i> {donation.location?.address || 'No address'}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                             <span className="text-xs text-slate-400">Pickup: {donation.pickupWindow}</span>
                             <span className="text-nb-blue text-xs font-bold">View Details →</span>
                        </div>
                    </div>
                ))
            )}
        </div>

        {selectedDonation && (
            <DonationDetailsModal 
                donation={selectedDonation} 
                onClose={() => setSelectedDonation(null)} 
            />
        )}
    </div>
  );
}
