"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { createUserProfile, getUserProfile } from "@/lib/auth-helpers";

export default function CreateDonation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    weight: "",
    weightUnit: "kg" as "kg" | "lbs",
    expiryDate: "",
    pickupWindow: "today-2-4pm",
    address: "",
    city: "",
    lat: 0,
    lng: 0,
  });

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);

      // If user is authenticated, ensure their profile exists
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (!profile) {
            // Profile doesn't exist, create it with donor role
            await createUserProfile(currentUser, "donor");
          } else if (profile.role !== "donor") {
            // Update role if needed
            await createUserProfile(currentUser, "donor", { role: "donor" });
          }
        } catch (err) {
          console.error("Error checking user profile:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      // Create user profile with donor role
      await createUserProfile(result.user, "donor");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Please sign in to create a donation");
        setLoading(false);
        return;
      }

      // Ensure user profile exists with donor role
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
          console.log("Creating user profile...");
          await createUserProfile(user, "donor");
          // Wait a moment for profile to be saved
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (profile.role !== "donor") {
          // Update role if needed
          await createUserProfile(user, "donor", { role: "donor" });
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (profileError: any) {
        console.error("Profile error:", profileError);
        setError("Failed to set up your profile. Please try again.");
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!formData.title || !formData.weight || !formData.expiryDate || !formData.address || !formData.city) {
        setError("Please fill in all required fields (including city)");
        setLoading(false);
        return;
      }

      const weightNum = parseFloat(formData.weight);
      const weightInKg = formData.weightUnit === "lbs" ? weightNum * 0.453592 : weightNum;

      const donationData = {
        donorId: user.uid,
        title: formData.title,
        description: formData.description || "",
        weight: weightInKg,
        weightUnit: "kg",
        expiryDate: Timestamp.fromDate(new Date(formData.expiryDate)),
        pickupWindow: formData.pickupWindow,
        status: "available",
        createdAt: Timestamp.now(),
        location: {
          lat: formData.lat,
          lng: formData.lng,
          address: `${formData.address}, ${formData.city}`,
        },
      };

      await addDoc(collection(db, "donations"), donationData);

      console.log("Donation created successfully");
      
      // Success - redirect to donor dashboard
      router.push("/donor");
    } catch (err: any) {
      console.error("Error creating donation:", err);
      setError(err.message || "Failed to create donation. Please try again.");
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="bg-white min-h-screen px-6 pt-12 pb-10 max-w-lg mx-auto flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-nb-blue mb-4"></i>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="bg-white min-h-screen px-6 pt-12 pb-10 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/donor"
            className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 text-nb-ink transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
        </div>

        <div className="text-center py-12">
          <div className="w-20 h-20 bg-nb-blue-soft rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-lock text-3xl text-nb-blue"></i>
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            Sign In Required
          </h2>
          <p className="text-slate-500 mb-8">
            You need to sign in to create a donation post.
          </p>
          {error && (
            <div className="mb-6 p-4 bg-nb-red-soft border border-nb-red/30 rounded-2xl text-nb-red text-sm font-medium">
              {error}
            </div>
          )}
          <button
            onClick={handleLogin}
            className="w-full bg-nb-ink text-white py-5 rounded-2xl font-display font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <i className="fab fa-google mr-2"></i>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen px-6 pt-12 pb-10 max-w-lg mx-auto relative">
        <div className="flex items-center justify-between mb-8">
        <Link
          href="/donor"
          className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 text-nb-ink transition-colors"
        >
                <i className="fas fa-arrow-left"></i>
            </Link>
             <div className="w-10 h-10 bg-nb-blue-soft text-nb-blue rounded-full flex items-center justify-center font-bold">
          D
        </div>
            </div>

      <h2 className="font-display text-3xl font-bold mb-8">
        New <span className="text-nb-blue">Donation</span>
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-nb-red-soft border border-nb-red/30 rounded-2xl text-nb-red text-sm font-medium">
          {error}
        </div>
      )}
        
      <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Area Removed */}
            
            {/* Fields */}
            <div className="space-y-5">
                <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">
              Item Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full nb-input p-4 font-medium"
              placeholder="e.g. 50 lbs Sourdough Bread"
              required
            />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">
                Weight *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="flex-1 nb-input p-4 font-medium"
                  placeholder="0"
                  step="0.1"
                  min="0"
                  required
                />
                <select
                  name="weightUnit"
                  value={formData.weightUnit}
                  onChange={handleInputChange}
                  className="nb-input p-4 font-medium min-w-[80px]"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
                    </div>
                    <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">
                Expiry Date *
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                className="w-full nb-input p-4 font-medium text-slate-500"
                required
                min={new Date().toISOString().split("T")[0]}
              />
                    </div>
                </div>

                <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">
              Pickup Window *
            </label>
                    <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, pickupWindow: "today-2-4pm" }))}
                className={`py-3 rounded-2xl border font-bold text-sm transition-all ${
                  formData.pickupWindow === "today-2-4pm"
                    ? "border-nb-blue bg-nb-blue-soft/30 text-nb-blue"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Today 2-4 PM
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, pickupWindow: "tomorrow-9-12pm" }))}
                className={`py-3 rounded-2xl border font-bold text-sm transition-all ${
                  formData.pickupWindow === "tomorrow-9-12pm"
                    ? "border-nb-blue bg-nb-blue-soft/30 text-nb-blue"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Tomorrow
              </button>
                    </div>
                </div>

                    <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">
              Pickup Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full nb-input p-4 font-medium mb-3"
              placeholder="Street address"
              required
            />
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full nb-input p-4 font-medium"
              placeholder="City"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full nb-input p-4 font-medium h-24 resize-none"
              placeholder="Location details, condition, special instructions..."
            ></textarea>
                </div>
            </div>

            <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="block w-full text-center bg-nb-ink text-white py-5 rounded-2xl font-display font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Posting...
              </span>
            ) : (
              "Post Donation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
