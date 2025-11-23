"use client";

import { useState } from "react";
import Link from "next/link";

export default function ActiveDelivery() {
  const [status, setStatus] = useState<"navigating" | "arrived" | "completed">("navigating");
  const [weight, setWeight] = useState("");
  const [spoilageChecked, setSpoilageChecked] = useState(false);
  const [expiryChecked, setExpiryChecked] = useState(false);

  // Mock data
  const destination = {
    name: "Loblaws Market",
    address: "123 Grocery Ln",
    coords: "43.4723,-80.5449"
  };

  const handleComplete = () => {
    // Submit logic here
    setStatus("completed");
  };

  // Using our backend proxy to fetch the static map securely
  const mapUrl = `/api/maps/static?center=${destination.coords}&zoom=15&size=800x600&markers=color:red%7Clabel:D%7C${destination.coords}`;

  if (status === 'completed') {
      return (
          <div className="h-screen bg-nb-bg flex items-center justify-center p-6">
              <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
                  <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                      <i className="fas fa-check"></i>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-nb-ink mb-2">Pickup Complete!</h2>
                  <p className="text-slate-500 mb-8">Thank you for helping reduce food waste. Please proceed to the distribution center.</p>
                  <Link href="/volunteer" className="block w-full py-4 bg-nb-ink text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                      Back to Dashboard
                  </Link>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Map Section - Full height on desktop, top half on mobile */}
      <div className="relative w-full md:w-1/2 h-[35vh] md:h-screen bg-slate-200 order-1 md:order-2 overflow-hidden shrink-0">
         {/* Map Image */}
         <div className="absolute inset-0 w-full h-full bg-slate-200">
            {/* We use a standard img tag here because the source is our own API route returning an image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                src={mapUrl} 
                alt="Map showing destination" 
                className="w-full h-full object-cover"
            />
         </div>
         
         {/* Overlay Controls */}
         <Link href="/volunteer" className="absolute top-6 left-6 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 text-nb-ink transition-transform hover:scale-105">
             <i className="fas fa-arrow-left"></i>
         </Link>

         {/* Destination Pill - Moved to top on mobile to avoid overlap with sheet */}
         <div className="absolute top-20 left-6 right-6 md:top-auto md:bottom-6 md:left-auto md:right-6 md:w-80 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-nb-blue/10 text-nb-blue rounded-full flex items-center justify-center shrink-0">
                    <i className="fas fa-location-dot text-lg"></i>
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Destination</p>
                    <p className="font-bold text-nb-ink">{destination.name}</p>
                    <p className="text-xs text-slate-400 truncate">{destination.address}</p>
                </div>
            </div>
         </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col bg-white order-2 md:order-1 md:h-screen md:overflow-y-auto relative z-10 -mt-8 md:mt-0 rounded-t-[2.5rem] md:rounded-none shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none">
        <div className="p-6 md:p-12 max-w-2xl mx-auto w-full flex-1 flex flex-col">
            
            <div className="mb-6 md:mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nb-blue/10 text-nb-blue text-sm font-bold mb-4">
                    <span className="w-2 h-2 rounded-full bg-nb-blue animate-pulse"></span>
                    Active Task
                </div>
                <h1 className="font-display text-2xl md:text-4xl font-bold text-nb-ink mb-2">
                    {status === 'navigating' ? 'Head to Pickup' : 'Pickup Details'}
                </h1>
                <p className="text-slate-500 text-base md:text-lg">
                    {status === 'navigating' 
                        ? 'Navigate to the donor location to pick up the surplus food.' 
                        : 'Verify the donation and record details.'}
                </p>
            </div>

            {/* Task Info Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-nb-ink">Task #1024</h3>
                        <p className="text-slate-500">Contact: Manager John</p>
                    </div>
                    <a href="tel:5550199" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-nb-blue hover:text-white hover:border-nb-blue transition-colors">
                        <i className="fas fa-phone"></i>
                    </a>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Type</p>
                        <p className="font-semibold text-nb-ink">Mixed Grocery</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-xs font-bold uppercase mb-1">Est. Weight</p>
                        <p className="font-semibold text-nb-ink">~45 lbs</p>
                    </div>
                </div>
            </div>

            {status === 'navigating' ? (
                <div className="mt-auto">
                    <button 
                        onClick={() => setStatus('arrived')}
                        className="w-full py-4 bg-nb-ink text-white rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        <span>I've Arrived</span>
                        <i className="fas fa-arrow-right"></i>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <button className="py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Skip Task</button>
                        <button className="py-3 rounded-xl border border-slate-200 text-nb-red font-bold hover:bg-red-50 hover:border-red-100 transition-colors">Report Issue</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Pickup Form */}
                    <div>
                        <label className="block text-sm font-bold text-nb-ink mb-2">Recorded Weight (lbs)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="e.g. 45"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nb-blue/20 focus:border-nb-blue transition-all font-bold text-lg"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">lbs</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Approximate weight is fine.</p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-nb-ink">Quality Checks</label>
                        
                        <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={spoilageChecked}
                                onChange={(e) => setSpoilageChecked(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-nb-blue focus:ring-nb-blue"
                            />
                            <div>
                                <span className="font-bold text-nb-ink block">Spoilage Check</span>
                                <span className="text-xs text-slate-500">Fresh items are free of mold/rot</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={expiryChecked}
                                onChange={(e) => setExpiryChecked(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-nb-blue focus:ring-nb-blue"
                            />
                            <div>
                                <span className="font-bold text-nb-ink block">Expiry Check</span>
                                <span className="text-xs text-slate-500">Non-perishables are within date</span>
                            </div>
                        </label>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleComplete}
                            disabled={!weight || !spoilageChecked || !expiryChecked}
                            className="w-full py-4 bg-nb-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span>Confirm Pickup</span>
                            <i className="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

