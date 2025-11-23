"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getDistanceFromLatLonInKm } from "@/lib/location";
import { getUserProfile } from "@/lib/auth-helpers";
import { UserProfile } from "@/types/schema";

export default function CharityDashboard() {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-nb-ink">Dashboard</h1>
      </div>

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
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold mr-4">S</div>
                      <div>
                          <p className="font-bold text-sm">Truck #402 (Sarah)</p>
                          <p className="text-xs text-slate-400">Walmart Dairy • 3 Pallets</p>
                      </div>
                  </div>
                  <span className="text-nb-orange font-bold text-sm">ETA 10 MIN</span>
              </div>
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold mr-4">M</div>
                      <div>
                          <p className="font-bold text-sm">Truck #112 (Mike)</p>
                          <p className="text-xs text-slate-400">Farm A Roots • 12 Boxes</p>
                      </div>
                  </div>
                  <span className="text-nb-teal font-bold text-sm">ARRIVED</span>
              </div>
          </div>
      </div>
    </>
  );
}

