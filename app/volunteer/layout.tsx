"use client";

import { useAuth } from "@/app/context/AuthContext";

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-nb-bg relative overflow-hidden font-sans">
      {/* Logout Button (Floating) */}
      <button 
        onClick={logout}
        className="absolute top-4 right-4 z-50 text-xs font-bold text-slate-400 hover:text-red-500 bg-white/80 backdrop-blur px-3 py-1 rounded-full"
      >
        Sign Out
      </button>

      {/* Main Content */}
      <main className="h-full relative z-10">
        {children}
      </main>
    </div>
  );
}

