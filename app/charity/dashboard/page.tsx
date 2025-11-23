/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { getDistanceFromLatLonInKm } from "@/lib/location";
import { getUserProfile } from "@/lib/auth-helpers";
import { UserProfile, UrgentRequest, Donation } from "@/types/schema";
import { onAuthStateChanged } from "firebase/auth";

export default function CharityDashboard() {
  const [incomingDonations, setIncomingDonations] = useState<Donation[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Query for donation posts that must ship to this food bank
    const q = query(
      collection(db, "donations"),
      where("mustShipTo", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donation[];
      
      // Filter to show only non-delivered donations
      const activeDonations = donations.filter(d => d.status !== 'delivered');
      setIncomingDonations(activeDonations);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkReceived = async (donation: Donation) => {
    if (!donation.id) return;

    try {
      // Update donation status to delivered
      await updateDoc(doc(db, "donations", donation.id), {
        status: 'delivered'
      });

      // If this donation was created from a request, mark the request as fulfilled
      if (donation.fromRequestId) {
        await updateDoc(doc(db, "requests", donation.fromRequestId), {
          status: 'fulfilled'
        });
      }
    } catch (error) {
      console.error("Error marking donation as received:", error);
      alert("Failed to update status");
    }
  };

  return (
    <>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-blue-soft rounded-full flex items-center justify-center text-nb-blue mb-4">
                  <i className="fas fa-weight-hanging"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Rescued</p>
                  <p className="font-display text-3xl font-bold text-nb-ink mt-1">1,240 <span className="text-base text-slate-400 font-sans font-medium">kg</span></p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-teal-soft rounded-full flex items-center justify-center text-nb-teal mb-4">
                  <i className="fas fa-utensils"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Meals Served</p>
                  <p className="font-display text-3xl font-bold text-nb-teal mt-1">3,400</p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40 border-l-4 border-l-nb-red">
              <div className="w-10 h-10 bg-nb-red-soft rounded-full flex items-center justify-center text-nb-red mb-4">
                  <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expiring (24h)</p>
                  <p className="font-display text-3xl font-bold text-nb-red mt-1">15 <span className="text-base text-slate-400 font-sans font-medium">items</span></p>
              </div>
          </div>
            <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-4">
                  <i className="fas fa-truck"></i>
              </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Drivers</p>
                  <p className="font-display text-3xl font-bold text-nb-ink mt-1">12</p>
              </div>
          </div>
      </div>

      {/* Incoming Ticker */}
      <div className="bg-nb-ink rounded-3xl p-8 text-white shadow-float relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex justify-between items-end mb-6 relative z-10">
              <h3 className="font-display text-2xl font-bold">Incoming Logistics</h3>
              <span className="inline-flex items-center bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-nb-teal"><span className="w-2 h-2 bg-nb-teal rounded-full mr-2 animate-pulse"></span> Live Updates</span>
          </div>
          
          <div className="space-y-4 relative z-10">
              {incomingDonations.length > 0 ? (
                incomingDonations.map(donation => (
                  <div key={donation.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold mr-4">
                            D
                          </div>
                          <div>
                              <p className="font-bold text-sm">{donation.title}</p>
                              <p className="text-xs text-slate-400">
                                {donation.weight} {donation.weightUnit}
                                {donation.fromRequestId && <span className="ml-2 text-nb-teal">• From Request</span>}
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-nb-teal font-bold text-xs tracking-wider hidden sm:block">
                          {donation.status === 'picked_up' ? 'IN TRANSIT' : 'READY'}
                        </span>
                        <button 
                            onClick={() => handleMarkReceived(donation)}
                            className="bg-white/10 hover:bg-nb-teal hover:text-nb-ink text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group"
                            title="Confirm delivery"
                        >
                            <i className="fas fa-check group-hover:scale-110 transition-transform"></i>
                            Received
                        </button>
                      </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No incoming deliveries at the moment.</p>
                </div>
              )}
          </div>
      </div>
    </>
  );
}

