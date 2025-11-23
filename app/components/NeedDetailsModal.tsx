"use client";

import React from 'react';
import { Timestamp } from 'firebase/firestore';

// You can move this interface to your schema file later
export interface Need {
    id: string;
    title: string;
    organizationName: string;
    description: string;
    urgency: 'low' | 'medium' | 'high';
    location: { address: string };
    createdAt: Timestamp;
    // Add other fields as necessary based on your UrgentRequest type
    item?: string;
    quantity?: string;
    foodBankName?: string;
}

interface NeedDetailsModalProps {
    need: Need;
    onClose: () => void;
}

export default function NeedDetailsModal({ need, onClose }: NeedDetailsModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors z-10"
                >
                    <i className="fas fa-times"></i>
                </button>
                
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                            need.urgency === 'high' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'
                        }`}>
                            <i className="fas fa-hand-holding-heart"></i>
                        </div>
                        <div>
                            <h2 className="font-display text-xl font-bold text-nb-ink leading-tight">{need.title || need.item}</h2>
                            <p className="text-slate-400 text-sm font-bold">{need.organizationName || need.foodBankName}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Description</p>
                            <p className="text-slate-600 text-sm leading-relaxed">{need.description || "No description provided."}</p>
                        </div>

                        <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                            <i className="fas fa-map-marker-alt text-slate-400 ml-2"></i>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Location</p>
                                <p className="text-nb-ink text-sm font-bold">{need.location?.address || 'No address'}</p>
                            </div>
                        </div>
                        
                        {need.quantity && (
                             <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
                                <i className="fas fa-box text-slate-400 ml-2"></i>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Quantity Needed</p>
                                    <p className="text-nb-ink text-sm font-bold">{need.quantity}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full mt-8 py-3 bg-nb-ink text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
}
