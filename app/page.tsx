"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { getRoleRoute } from "@/lib/routes";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (!profile || !profile.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        // Redirect based on role
        router.push(getRoleRoute(profile.role));
      }
    }
  }, [user, profile, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
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

      <div className="max-w-md w-full space-y-8 relative z-10 text-center">
        
        <div className="space-y-2">
          <h1 className="font-display text-5xl font-bold text-nb-ink leading-tight">
            Shurplus
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Connecting food distributors with communities in need.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-nb-ink outline-none transition-colors"
                placeholder="hello@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-nb-ink outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button 
              type="submit"
              className="w-full bg-nb-ink text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
              {isRegistering ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-slate-500 hover:text-nb-ink font-medium"
            >
              {isRegistering ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-slate-100 text-nb-ink font-bold py-3 px-6 rounded-xl hover:border-nb-ink transition-colors flex items-center justify-center gap-3"
          >
            <span className="text-xl">G</span>
            <span>Google</span>
          </button>
        </div>

        <div className="pt-4">
            <p className="text-slate-400 text-xs">Neo-Bauhaus MVP v0.1.0</p>
        </div>
      </div>
    </main>
  );
}
