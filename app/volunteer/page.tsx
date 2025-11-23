"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Donation } from "@/types/schema";
import DonationDetailsModal from "@/app/components/DonationDetailsModal";

export default function VolunteerRoutes() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  const fetchDonations = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

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

        {/* Route Card */}
        <div className="bg-white rounded-[2rem] shadow-soft p-6 mb-6 relative overflow-hidden border border-slate-100">
            {/* Decorative Blob */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-nb-orange-soft rounded-bl-full -mr-10 -mt-10 z-0 opacity-50"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <span className="bg-nb-ink text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm">45 MINS</span>
                    <div className="text-right">
                        <span className="font-display font-bold text-3xl text-slate-800 leading-none">80</span>
                        <div className="text-xs text-slate-400 font-bold uppercase">Meals Saved</div>
                    </div>
                </div>

                {/* Visual Route Line */}
                <div className="relative pl-4 border-l-2 border-slate-100 space-y-8 mb-8 ml-2">
                    {/* Stop 1 */}
                    <div className="relative">
                        <div className="absolute -left-[23px] top-1 w-5 h-5 bg-white border-4 border-nb-ink rounded-full"></div>
                        <div>
                            <h4 className="font-bold text-nb-ink text-lg">Loblaws Market</h4>
                            <p className="text-sm text-slate-500">Pickup: 3 Boxes Apples</p>
                        </div>
                    </div>
                    {/* Stop 2 */}
                    <div className="relative">
                        <div className="absolute -left-[23px] top-1 w-5 h-5 bg-nb-ink rounded-full shadow-sm"></div>
                        <div>
                            <h4 className="font-bold text-nb-ink text-lg">Central Hub</h4>
                            <p className="text-sm text-slate-500">Drop-off Zone B</p>
                        </div>
                    </div>
                </div>

                <Link href="/volunteer/active" className="block w-full text-center bg-nb-blue text-white py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-glow hover:-translate-y-1">
                    Start Route
                </Link>
            </div>
        </div>
        
        {/* Secondary Route (Dimmed) */}
        <div className="bg-white/60 rounded-[2rem] p-6 border border-slate-100 opacity-60 mb-8">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold">1.5 HRS</span>
                <span className="font-display font-bold text-2xl text-slate-400">120 Meals</span>
            </div>
            <p className="text-slate-400 font-bold">Farm Boy -&gt; Shelter</p>
        </div>

        {/* Available Donations List */}
        <h3 className="font-display text-xl font-bold mb-5 text-nb-ink">Available Donations</h3>
        <div className="space-y-4">
            {loading ? (
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

