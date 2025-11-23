"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp, addDoc } from "firebase/firestore";
import { Donation, UserProfile, UrgentRequest } from "@/types/schema";
import DonationCard from "@/components/donor/DonationCard";
import RequestCardStack from "@/app/components/donor/RequestCardStack";
import { getUserProfile } from "@/lib/auth-helpers";

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState<'nearby' | 'myitems'>('nearby');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<UrgentRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UrgentRequest[]>([]);
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

  // Fetch Pending Requests (Accepted by me)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "requests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "accepted")
    );

    const unsubscribePending = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UrgentRequest[];
      
      setPendingRequests(requests);
    });

    return () => unsubscribePending();
  }, [user]);

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

  const handleAcceptRequest = async (request: UrgentRequest) => {
    if (!user || !request.id) return;

    try {
      // Parse quantity to extract weight (e.g., "50 kg" -> 50)
      let weight = 10; // Default weight
      let weightUnit: 'kg' | 'items' = 'kg';
      if (request.quantity) {
        const match = request.quantity.match(/([0-9.]+)\s*(kg|lbs|items?|boxes?)?/i);
        if (match) {
          weight = parseFloat(match[1]);
          const unit = match[2]?.toLowerCase();
          if (unit?.includes('item') || unit?.includes('box')) {
            weightUnit = 'items';
          }
        }
      }

      // Calculate expiry date (default 7 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      // Use donor's saved address or default location
      const donorAddress = userProfile?.pickupAddress || userProfile?.location?.address || "Pickup location to be confirmed";
      const donorLat = userProfile?.location?.lat || 43.6532;
      const donorLng = userProfile?.location?.lng || -79.3832;

      // Auto-create donation post from request data
      const donationData: Omit<Donation, 'id'> = {
        donorId: user.uid,
        title: request.item,
        description: request.details || `Fulfilling request from ${request.foodBankName || 'food bank'}`,
        weight: weight,
        weightUnit: weightUnit,
        expiryDate: Timestamp.fromDate(expiryDate),
        pickupWindow: "All Day",
        status: 'available',
        createdAt: Timestamp.now(),
        location: {
          lat: donorLat,
          lng: donorLng,
          address: donorAddress
        },
        mustShipTo: request.foodBankId,
        fromRequestId: request.id
      };

      // Create the donation post first
      await addDoc(collection(db, "donations"), donationData);

      // Then update the request status
      await updateDoc(doc(db, "requests", request.id), {
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedByName: userProfile?.displayName || user.displayName || 'Anonymous Donor',
        acceptedAt: Timestamp.now()
      });

    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request. Please try again.");
    }
  };

  const handleDismissRequest = (request: UrgentRequest) => {
    // RequestCardStack handles local hiding, so we don't need to do anything here
    // unless we want to persist the dismissal to a user preference/collection
    console.log("Dismissed:", request.id);
  };

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
            My Activity
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="space-y-6">
        {activeTab === 'nearby' ? (
          <>
            {/* Urgent Requests Stack */}
            <div className="mb-8">
              <RequestCardStack 
                requests={urgentRequests} 
                onAccept={handleAcceptRequest}
                onDismiss={handleDismissRequest}
              />
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="font-display text-xl font-bold text-nb-ink mb-4">Pending Deliveries</h3>
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <h4 className="font-bold text-nb-ink">
                          {req.item}
                          {req.quantity && <span className="text-slate-500 font-normal text-sm ml-2">({req.quantity})</span>}
                        </h4>
                        <p className="text-xs text-slate-400">For: {req.foodBankName || 'Food Bank'}</p>
                      </div>
                      <span className="px-3 py-1 bg-nb-teal-soft text-nb-teal text-xs font-bold rounded-full">
                        Accepted
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-display text-xl font-bold text-nb-ink mb-4">My Listings</h3>
              {loadingDonations ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-3xl text-nb-blue mb-4"></i>
                  <p className="text-slate-500">Loading your donations...</p>
              </div>
              ) : myDonations.length > 0 ? (
                <div className="space-y-4">
                  {myDonations.map((donation) => (
                    <DonationCard key={donation.id} donation={donation} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400">You haven't posted any donations yet.</p>
                  <Link href="/donor/create" className="mt-4 inline-block text-nb-blue hover:underline font-bold">Create a new donation</Link>
                  </div>
              )}
            </div>
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

