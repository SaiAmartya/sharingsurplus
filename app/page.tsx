"use client";

import { useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (!profile || !profile.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        // Redirect based on role
        switch (profile.role) {
          case 'donor':
            router.push('/donor');
            break;
          case 'volunteer':
            router.push('/volunteer');
            break;
          case 'foodbank':
            router.push('/charity/dashboard');
            break;
          default:
            router.push('/onboarding');
        }
      }
    }
  }, [user, profile, loading, router]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-nb-bg bg-dots flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="animate-pulse text-nb-ink font-bold text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-nb-bg bg-dots flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-nb-blue-soft/40 rounded-bl-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-nb-orange-soft/30 rounded-tr-full -ml-20 -mb-20 pointer-events-none"></div>

      <div className="max-w-md w-full space-y-12 relative z-10 text-center">
        
        <div className="space-y-2">
          <h1 className="font-display text-5xl font-bold text-nb-ink leading-tight">
            Share <br/><span className="text-nb-blue">Surplus.</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Connecting food distributors with communities in need.
          </p>
        </div>

        <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full bg-nb-ink text-white font-bold py-4 px-6 rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="text-xl">G</span>
              <span>Get Started with Google</span>
            </button>
            <p className="text-xs text-slate-400">
              Join as a Distributor, Volunteer, or Food Bank.
            </p>
        </div>

        <div className="pt-8">
            <p className="text-slate-400 text-xs">Neo-Bauhaus MVP v0.1.0</p>
        </div>
      </div>
    </main>
  );
}
