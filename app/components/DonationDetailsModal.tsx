"use client";

import { Donation } from "@/types/schema";
import { Timestamp } from "firebase/firestore";

interface DonationDetailsModalProps {
  donation: Donation;
  onClose: () => void;
}

export default function DonationDetailsModal({ donation, onClose }: DonationDetailsModalProps) {
  const statusColors = {
    available: 'bg-nb-teal-soft text-nb-teal',
    claimed: 'bg-nb-blue-soft text-nb-blue',
    picked_up: 'bg-nb-orange-soft text-nb-orange',
    delivered: 'bg-nb-ink text-white',
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
            <h2 className="font-display text-2xl font-bold text-nb-ink">Donation Details</h2>
            <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                <i className="fas fa-times"></i>
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">
            {/* Title & Status */}
            <div className="mb-8">
                <h1 className="font-display text-3xl font-bold text-nb-ink leading-tight mb-3">
                {donation.title}
                </h1>
                <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-lg ${statusColors[donation.status]}`}>
                {donation.status.replace(/_/g, ' ').toUpperCase()}
                </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-6">
                
                {/* Weight/Qty & Expiry */}
                <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">
                    {donation.weightUnit === 'items' ? 'Quantity' : 'Weight'}
                    </div>
                    <div className="font-display text-xl font-bold text-nb-ink">
                    {donation.weight} <span className="text-sm text-slate-500">{donation.weightUnit}</span>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Expires</div>
                    <div className="font-display text-lg font-bold text-nb-ink">
                    {formatDate(donation.expiryDate)}
                    </div>
                </div>
                </div>

                {/* Pickup Window */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-nb-blue shadow-sm shrink-0">
                    <i className="far fa-clock"></i>
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-0.5">Pickup Window</div>
                    <div className="font-bold text-nb-ink">{donation.pickupWindow}</div>
                </div>
                </div>

                {/* Address */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
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
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed">
                    {donation.description}
                    </div>
                </div>
                )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-nb-ink text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
                Close
            </button>
        </div>

      </div>
    </div>
  );
}
