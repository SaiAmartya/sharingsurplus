/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { UrgentRequest, DistributionSession } from "@/types/schema";
import { onAuthStateChanged } from "firebase/auth";

export default function CharityDashboard() {
  const [incomingRequests, setIncomingRequests] = useState<UrgentRequest[]>([]);
  const [user, setUser] = useState<any>(null);
  const [mealsServed, setMealsServed] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "requests"),
      where("foodBankId", "==", user.uid),
      where("status", "==", "accepted")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UrgentRequest[];
      setIncomingRequests(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch meals served stat
  useEffect(() => {
    if (!user) return;

    const fetchMealsServed = async () => {
      const q = query(
        collection(db, "distributions"),
        where("foodBankId", "==", user.uid),
        where("status", "==", "completed")
      );
      const snapshot = await getDocs(q);
      
      let total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as DistributionSession;
        total += data.distributedMealCount || 0;
      });
      
      setMealsServed(total);
    };

    fetchMealsServed();
  }, [user]);

  const handleMarkReceived = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: 'fulfilled'
      });
    } catch (error) {
      console.error("Error marking request as received:", error);
      alert("Failed to update status");
    }
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-blue rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-blue/20">
                  <i className="fas fa-weight-hanging"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Rescued</p>
                  <p className="font-display text-3xl font-bold text-nb-ink mt-1">1,240 <span className="text-base text-slate-400 font-sans font-medium">kg</span></p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-teal rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-teal/20">
                  <i className="fas fa-utensils"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Meals Served</p>
                  <p className="font-display text-3xl font-bold text-nb-teal mt-1">{mealsServed.toLocaleString()}</p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40 border-l-4 border-l-nb-red">
              <div className="w-10 h-10 bg-nb-red rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-red/20">
                  <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expiring (24h)</p>
                  <p className="font-display text-3xl font-bold text-nb-red mt-1">15 <span className="text-base text-slate-400 font-sans font-medium">items</span></p>
              </div>
          </div>
            <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-ink rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-ink/20">
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
              {incomingRequests.length > 0 ? (
                incomingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold mr-4">
                            {req.acceptedByName ? req.acceptedByName.charAt(0) : 'D'}
                          </div>
                          <div>
                              <p className="font-bold text-sm">{req.acceptedByName || 'Anonymous Donor'}</p>
                              <p className="text-xs text-slate-400">Bringing: {req.item}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-nb-teal font-bold text-xs tracking-wider hidden sm:block">ACCEPTED</span>
                        <button 
                            onClick={() => handleMarkReceived(req.id!)}
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

