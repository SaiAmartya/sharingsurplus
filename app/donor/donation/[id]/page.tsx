"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { Donation } from "@/types/schema";

export default function DonationDetails() {
  const params = useParams();
  const router = useRouter();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDonation = async () => {
      if (!params.id) return;
      
      try {
        const docRef = doc(db, "donations", params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDonation({ id: docSnap.id, ...docSnap.data() } as Donation);
        } else {
          setError("Donation not found");
        }
      } catch (err: any) {
        console.error("Error fetching donation:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDonation();
  }, [params.id]);

  const handleDelete = async () => {
    if (!donation?.id || !confirm("Are you sure you want to delete this listing?")) return;
    
    try {
      await deleteDoc(doc(db, "donations", donation.id));
      router.push("/donor");
    } catch (err) {
      console.error("Error deleting donation:", err);
      alert("Failed to delete donation");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (error || !donation) return <div className="p-10 text-center text-red-500">{error || "Donation not found"}</div>;

  const statusColors = {
    available: 'bg-nb-teal-soft text-nb-teal',
    claimed: 'bg-nb-blue-soft text-nb-blue',
    picked_up: 'bg-nb-orange-soft text-nb-orange',
    delivered: 'bg-nb-ink text-white',
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white px-6 pt-12 pb-10 max-w-lg mx-auto rounded-3xl border-2 border-slate-100 shadow-sm my-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/donor"
          className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <i className="fas fa-arrow-left text-slate-600"></i>
        </Link>
        <div className="flex gap-2">
          {donation.donorId === auth.currentUser?.uid && (
            <button 
              onClick={handleDelete}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          )}
        </div>
      </div>

      {/* Title & Status */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl font-bold text-nb-ink leading-tight">
            {donation.title}
          </h1>
        </div>
        <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-lg ${statusColors[donation.status]}`}>
          {donation.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Details Grid */}
      <div className="space-y-6">
        
        {/* Weight/Qty & Expiry */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-nb-bg p-4 rounded-2xl border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">
              {donation.weightUnit === 'items' ? 'Quantity' : 'Weight'}
            </div>
            <div className="font-display text-xl font-bold text-nb-ink">
              {donation.weight} <span className="text-sm text-slate-500">{donation.weightUnit}</span>
            </div>
          </div>
          
          <div className="bg-nb-bg p-4 rounded-2xl border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Expires</div>
            <div className="font-display text-lg font-bold text-nb-ink">
              {formatDate(donation.expiryDate)}
            </div>
          </div>
        </div>

        {/* Pickup Window */}
        <div className="bg-nb-bg p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-nb-blue shadow-sm shrink-0">
            <i className="far fa-clock"></i>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-0.5">Pickup Window</div>
            <div className="font-bold text-nb-ink">{donation.pickupWindow}</div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-nb-bg p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-nb-orange shadow-sm shrink-0">
            <i className="fas fa-map-marker-alt"></i>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase mb-0.5">Location</div>
            <div className="font-bold text-nb-ink">{donation.location.address}</div>
          </div>
        </div>

        {/* Description */}
        {donation.description && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase ml-2">Description</div>
            <div className="bg-nb-bg p-5 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed">
              {donation.description}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
