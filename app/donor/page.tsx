"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Donation, UserProfile } from "@/types/schema";
import DonationCard from "@/components/donor/DonationCard";
import { getUserProfile } from "@/lib/auth-helpers";

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState<'nearby' | 'myitems'>('nearby');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
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

  useEffect(() => {
    if (user && userProfile) {
      setLoadingDonations(true);
      const q = query(
        collection(db, "donations"),
        where("donorId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const unsubscribeDonations = onSnapshot(q, (snapshot) => {
        const donationsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Donation[];
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
        <div className="flex justify-between items-start mb-6">
             <Link href="/" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-nb-ink shadow-sm transition-colors">
                <i className="fas fa-arrow-left"></i>
            </Link>
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
             {/* Urgent Card */}
            <div className="bg-nb-red-soft rounded-3xl p-6 relative overflow-hidden group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-nb-red/20 rounded-full group-hover:scale-110 transition-transform"></div>
                
                <div className="flex items-start justify-between relative z-10">
                    <span className="bg-white text-nb-red px-3 py-1.5 rounded-full text-xs font-bold shadow-sm tracking-wide">URGENT • 2km</span>
                    <span className="bg-white/60 w-10 h-10 flex items-center justify-center rounded-full text-nb-red shadow-sm"><i className="fas fa-arrow-right"></i></span>
                </div>
                
                <div className="mt-6 relative z-10">
                    <h3 className="font-display text-2xl font-bold text-rose-900">Canned Beans</h3>
                    <p className="text-rose-900/70 text-sm mt-1 font-medium">St. Mary's Food Bank</p>
                    <div className="mt-4 inline-flex items-center text-rose-900/80 text-xs font-bold bg-white/40 px-3 py-1 rounded-full">
                        <i className="far fa-clock mr-2"></i> Needed by 4 PM
                    </div>
                </div>
            </div>

            {/* Regular Need Card */}
            <div className="nb-card p-1.5 flex items-stretch">
                <div className="w-24 bg-nb-teal-soft rounded-2xl flex items-center justify-center shrink-0">
                    <i className="fas fa-baby-carriage text-3xl text-nb-teal"></i>
                </div>
                <div className="p-4 flex-1">
                    <h3 className="font-display text-lg font-bold text-nb-ink">Baby Formula</h3>
                    <p className="text-slate-500 text-sm">North York Harvest</p>
                    <div className="mt-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-nb-orange bg-nb-orange-soft px-2.5 py-1 rounded-lg">High Demand</span>
                    </div>
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

