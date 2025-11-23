"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Donation, UserProfile, UrgentRequest } from "@/types/schema";
import DonationCard from "@/components/donor/DonationCard";
import { getUserProfile } from "@/lib/auth-helpers";

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState<'nearby' | 'myitems'>('nearby');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<UrgentRequest[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Fetch Urgent Requests
  useEffect(() => {
    const q = query(
      collection(db, "requests"),
      where("status", "==", "open")
    );

    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UrgentRequest[];
      
      // Sort client-side to avoid Firestore composite index requirement
      requests.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setUrgentRequests(requests);
    });

    return () => unsubscribeRequests();
  }, []);

  useEffect(() => {
    if (user && userProfile) {
      setLoadingDonations(true);
      const q = query(
        collection(db, "donations"),
        where("donorId", "==", user.uid)
      );
      const unsubscribeDonations = onSnapshot(q, (snapshot) => {
        const donationsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Donation[];
        
        // Sort client-side to avoid Firestore composite index requirement
        donationsList.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        
        setMyDonations(donationsList);
        setLoadingDonations(false);
      }, (error) => {
        console.error("Error fetching my donations:", error);
        setLoadingDonations(false);
      });

      return () => unsubscribeDonations();
    } else if (!user) {
      setMyDonations([]); // Clear donations if logged out
      setLoadingDonations(false);
    }
  }, [user, userProfile]);

  return (
    <div className="pb-32 pt-12 px-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-end items-start mb-6">
            <div className="w-10 h-10 bg-nb-ink text-white rounded-full flex items-center justify-center font-bold">
                {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'D'}
            </div>
        </div>

        <h1 className="font-display text-4xl font-bold text-nb-ink leading-tight">
          Share <br /><span className="text-nb-blue">Surplus.</span>
        </h1>

        {/* Soft Tabs */}
        <div className="mt-6 flex bg-white rounded-full p-1.5 shadow-sm w-full border border-slate-100 relative overflow-hidden">
          {/* Animated Background logic would go here, using simple conditional styling for now */}
          <button
            onClick={() => setActiveTab('nearby')}
            className={`flex-1 py-3 rounded-full text-sm font-bold relative z-10 transition-colors ${
              activeTab === 'nearby' ? 'bg-nb-ink text-white shadow-md' : 'text-slate-500 hover:text-nb-blue'
            }`}
          >
            Nearby Needs
          </button>
          <button
            onClick={() => setActiveTab('myitems')}
            className={`flex-1 py-3 rounded-full text-sm font-bold relative z-10 transition-colors ${
              activeTab === 'myitems' ? 'bg-nb-ink text-white shadow-md' : 'text-slate-500 hover:text-nb-blue'
            }`}
          >
            My Listings ({myDonations.length})
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="space-y-6">
        {activeTab === 'nearby' ? (
          <>
            {/* Urgent Requests Carousel */}
            {urgentRequests.length > 0 ? (
              <div className="flex overflow-x-auto pb-4 -mx-6 px-6 space-x-4 no-scrollbar snap-x snap-mandatory">
                {urgentRequests.map((req) => (
                  <div 
                    key={req.id}
                    className={`min-w-[85%] snap-center rounded-3xl p-6 relative overflow-hidden group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                      req.urgency === 'high' ? 'bg-nb-red-soft' : 
                      req.urgency === 'medium' ? 'bg-nb-orange-soft' : 'bg-nb-teal-soft'
                    }`}
                  >
                    <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full group-hover:scale-110 transition-transform ${
                      req.urgency === 'high' ? 'bg-nb-red/20' : 
                      req.urgency === 'medium' ? 'bg-nb-orange/20' : 'bg-nb-teal/20'
                    }`}></div>
                    
                    <div className="flex items-start justify-between relative z-10">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm tracking-wide bg-white ${
                        req.urgency === 'high' ? 'text-nb-red' : 
                        req.urgency === 'medium' ? 'text-nb-orange' : 'text-nb-teal'
                      }`}>
                        {req.urgency.toUpperCase()}
                      </span>
                      <span className={`bg-white/60 w-10 h-10 flex items-center justify-center rounded-full shadow-sm ${
                        req.urgency === 'high' ? 'text-nb-red' : 
                        req.urgency === 'medium' ? 'text-nb-orange' : 'text-nb-teal'
                      }`}>
                        <i className="fas fa-arrow-right"></i>
                      </span>
                    </div>
                    
                    <div className="mt-6 relative z-10">
                      <h3 className={`font-display text-2xl font-bold ${
                        req.urgency === 'high' ? 'text-rose-900' : 
                        req.urgency === 'medium' ? 'text-orange-900' : 'text-teal-900'
                      }`}>
                        {req.item}
                      </h3>
                      <p className={`text-sm mt-1 font-medium ${
                        req.urgency === 'high' ? 'text-rose-900/70' : 
                        req.urgency === 'medium' ? 'text-orange-900/70' : 'text-teal-900/70'
                      }`}>
                        {/* @ts-ignore */}
                        {req.foodBankName || 'Food Bank'}
                      </p>
                      <div className="mt-4 inline-flex items-center text-xs font-bold bg-white/40 px-3 py-1 rounded-full">
                        <i className="far fa-clock mr-2"></i> Needed ASAP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">No urgent requests nearby</p>
              </div>
            )}

            {/* Regular Need Card (Placeholder for now) */}
            <div className="nb-card p-1.5 flex items-stretch opacity-50">
                <div className="w-24 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                    <i className="fas fa-baby-carriage text-3xl text-slate-300"></i>
                </div>
                <div className="p-4 flex-1">
                    <h3 className="font-display text-lg font-bold text-nb-ink">More coming soon...</h3>
                    <p className="text-slate-500 text-sm">Check back later</p>
                </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {loadingDonations ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-3xl text-nb-blue mb-4"></i>
                <p className="text-slate-500">Loading your donations...</p>
            </div>
            ) : myDonations.length > 0 ? (
              myDonations.map((donation) => (
                <DonationCard key={donation.id} donation={donation} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">You haven't posted any donations yet.</p>
                <Link href="/donor/create" className="mt-4 inline-block text-nb-blue hover:underline">Create a new donation</Link>
                </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link href="/donor/create" className="fixed bottom-8 right-8 w-16 h-16 bg-nb-ink text-white rounded-[24px] shadow-glow hover:rotate-90 transition-all flex items-center justify-center text-2xl z-30 group">
          <i className="fas fa-plus group-hover:scale-110 transition-transform"></i>
      </Link>
    </div>
  );
}

