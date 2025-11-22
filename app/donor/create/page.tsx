"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { Donation } from "@/types/schema";
import { createUserProfile, getUserProfile } from "@/lib/auth-helpers";

export default function CreateDonation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    weight: "",
    weightUnit: "kg" as "kg" | "lbs" | "items",
    expiryDate: "",
    pickupStartTime: "12:00",
    pickupEndTime: "16:00",
    pickupAllDay: false,
    address: "123 Main St",
    city: "Toronto",
    lat: 0,
    lng: 0,
  });

  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  // AUTH
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);

      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (!profile) {
            await createUserProfile(currentUser, "donor");
          } else if (profile.role !== "donor") {
            await createUserProfile(currentUser, "donor", { role: "donor" });
          }
        } catch (err) {
          console.error("Profile error:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfile(result.user, "donor");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in required");

      if (!formData.title || !formData.weight || !formData.expiryDate || !formData.address || !formData.city) {
        throw new Error("Fill in all required fields");
      }

      const weight = parseFloat(formData.weight);
      if (isNaN(weight) || weight <= 0) throw new Error("Invalid weight");

      const donation: Omit<Donation, "id"> = {
        donorId: user.uid,
        title: formData.title,
        description: formData.description,
        weight: formData.weightUnit === "lbs" ? weight * 0.453592 : weight,
        weightUnit: formData.weightUnit === "items" ? "items" : "kg",
        expiryDate: Timestamp.fromDate(new Date(formData.expiryDate)),
        pickupWindow: formData.pickupAllDay 
          ? "All Day" 
          : `${formData.pickupStartTime} - ${formData.pickupEndTime}`,
        status: "available",
        createdAt: Timestamp.now(),
        location: {
          lat: formData.lat || 43.6532,
          lng: formData.lng || -79.3832,
          address: `${formData.address}, ${formData.city}`,
        },
      };

      await addDoc(collection(db, "donations"), donation);
      router.push("/donor");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <div className="p-10 text-center">Loading...</div>;

  if (!user)
    return (
      <div className="p-10 text-center max-w-lg mx-auto">
        <h2 className="font-display text-3xl mb-4">Sign In Required</h2>
        <button onClick={handleLogin} className="p-4 bg-nb-ink text-white rounded-xl w-full">
          Sign in with Google
        </button>
      </div>
    );

  return (
    <div className="bg-white min-h-screen px-6 pt-12 pb-10 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/donor"
          className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100"
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

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* TITLE */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase ml-2">Item Title *</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="nb-input p-4 w-full"
            placeholder="e.g. Tomatoes"
          />
        </div>

        {/* WEIGHT + EXPIRY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2">
                {formData.weightUnit === 'items' ? 'Quantity' : 'Weight'} *
              </label>
              <div className="flex bg-slate-100 rounded-lg p-1 scale-90 origin-right">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, weightUnit: 'kg' }))}
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${formData.weightUnit !== 'items' ? 'bg-white shadow-sm text-nb-ink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Weight
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, weightUnit: 'items' }))}
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${formData.weightUnit === 'items' ? 'bg-white shadow-sm text-nb-ink' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Quantity
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                name="weight"
                type="number"
                min="0"
                value={formData.weight}
                onChange={handleInputChange}
                className="nb-input p-4 flex-1 min-w-0"
                placeholder={formData.weightUnit === 'items' ? 'Count' : '0'}
              />
              {formData.weightUnit !== 'items' && (
                <select
                  name="weightUnit"
                  value={formData.weightUnit}
                  onChange={handleInputChange}
                  className="nb-input p-4 w-20"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center h-8">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2">Expiry Date *</label>
            </div>
            <input
              type="date"
              name="expiryDate"
              min={new Date().toISOString().split("T")[0]}
              value={formData.expiryDate}
              onChange={handleInputChange}
              className="nb-input p-4 w-full"
            />
          </div>
        </div>

        {/* PICKUP WINDOW */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase ml-2">Pickup Window *</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-nb-bg border border-slate-200 rounded-xl p-4">
              <span className="text-sm font-bold text-nb-ink">All Day Availability</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.pickupAllDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupAllDay: e.target.checked }))}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nb-blue"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                name="pickupStartTime"
                value={formData.pickupStartTime}
                onChange={handleInputChange}
                disabled={formData.pickupAllDay}
                className={`nb-input p-4 w-full ${formData.pickupAllDay ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
              />
              <input
                type="time"
                name="pickupEndTime"
                value={formData.pickupEndTime}
                onChange={handleInputChange}
                disabled={formData.pickupAllDay}
                className={`nb-input p-4 w-full ${formData.pickupAllDay ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase ml-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="nb-input p-4 w-full h-24 resize-none"
            placeholder="Condition, instructions, etc."
          />
        </div>

        {/* ADDRESS */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
            className="flex items-center justify-between w-full text-left"
          >
            <label className="text-xs font-bold text-slate-400 uppercase ml-2">Additional Information</label>
            <i className={`fas fa-chevron-down text-slate-400 transition-transform ${showAdditionalInfo ? 'rotate-180' : ''}`}></i>
          </button>
          
          {showAdditionalInfo && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-2">Pickup Address *</label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="nb-input p-4 w-full"
                  placeholder="Street address"
                />
              </div>

              <input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="nb-input p-4 w-full"
                placeholder="City"
              />
            </div>
          )}
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-nb-ink text-white py-5 rounded-2xl font-display font-bold"
        >
          {loading ? "Posting..." : "Post Donation"}
        </button>
      </form>
    </div>
  );
}
