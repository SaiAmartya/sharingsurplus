"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, storage, googleProvider } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { Donation } from "@/types/schema";
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
    photo: null as File | null,
    photoUrl: "",
    address: "",
    city: "",
    lat: 0,
    lng: 0,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const storageRef = ref(storage, `donations/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
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

      let photoUrl = formData.photoUrl;

      // Upload image if provided
      if (formData.photo) {
        try {
          photoUrl = await uploadImage(formData.photo);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          setError("Failed to upload image. Please try again.");
          setLoading(false);
          return;
        }
      }

      // Get geocoded coordinates (simplified - in production, use Google Maps Geocoding API)
      // For now, using placeholder coordinates
      const lat = formData.lat || 43.6532;
      const lng = formData.lng || -79.3832;

      // Convert weight to kg
      const weightInKg = formData.weightUnit === "lbs" 
        ? parseFloat(formData.weight) * 0.453592 
        : parseFloat(formData.weight);

      // Create donation object
      const donation: Omit<Donation, "id"> = {
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
          lat,
          lng,
          address: `${formData.address}, ${formData.city}`,
        },
      };

      // Only include photoUrl if it exists (Firestore doesn't allow undefined)
      if (photoUrl) {
        donation.photoUrl = photoUrl;
      }

      console.log("Saving donation to Firestore...", donation);

      // Save to Firestore
      const docRef = await addDoc(collection(db, "donations"), donation);
      console.log("Donation saved successfully with ID:", docRef.id);

      // Success - redirect to donor dashboard
      router.push("/donor");
    } catch (err: any) {
      console.error("Error creating donation:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      console.error("Full error:", JSON.stringify(err, null, 2));
      
      // Handle specific Firestore permission errors
      if (err.code === "permission-denied") {
        setError("Permission denied. Your user profile may not be set up correctly. Please sign out and sign in again.");
      } else if (err.code === "unauthenticated") {
        setError("You must be signed in to create a donation. Please sign in again.");
      } else if (err.code === "failed-precondition") {
        setError("Firestore rules error. Please ensure your user profile exists with the 'donor' role.");
      } else {
        setError(err.message || "Failed to create donation. Please try again. Error: " + (err.code || "Unknown"));
      }
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
            {/* Photo Area */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2 block">
            Photo (Optional)
          </label>
          <label
            htmlFor="photo-upload"
            className="aspect-video bg-nb-bg rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-nb-blue/30 cursor-pointer transition-all group relative overflow-hidden"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <>
                <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-nb-blue group-hover:scale-110 transition-transform">
                    <i className="fas fa-camera text-xl"></i>
                </div>
                <span className="font-bold text-sm group-hover:text-nb-blue">
                  Tap to Add Photo
                </span>
              </>
            )}
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
            </div>

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

