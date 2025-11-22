"use client";

import { useAuth } from "@/app/context/AuthContext";

export default function DonorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-nb-bg relative overflow-hidden">
      {/* Decor for Donor Section */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-nb-blue-soft/40 rounded-bl-[100px] pointer-events-none z-0"></div>
      
      {/* Logout Button (Floating) */}
      <button 
        onClick={logout}
        className="absolute top-4 right-4 z-50 text-xs font-bold text-slate-400 hover:text-red-500 bg-white/80 backdrop-blur px-3 py-1 rounded-full"
      >
        Sign Out
      </button>

      <main className="relative z-10 h-full">
        {children}
      </main>
    </div>
  );
}

