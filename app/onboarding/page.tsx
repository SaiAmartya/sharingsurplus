/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { User, signOut } from "firebase/auth";
import { getRoleRoute } from "@/lib/routes";
import AddressAutocomplete from "@/components/AddressAutocomplete";

/**
 * Supported question types in the onboarding flow
 */
type QuestionType = 'text' | 'select' | 'multiselect' | 'role-select' | 'address';

/**
 * Defines a single question in the onboarding flow
 */
interface Question {
  /** Unique identifier for storing the answer */
  id: string;
  /** Type of input control to render */
  type: QuestionType;
  /** Main question text shown to user */
  question: string;
  /** Optional additional context shown below the question */
  subtext?: string;
  /** Options for select/multiselect types */
  options?: { label: string; value: string; icon?: string }[];
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Validation function to check input validity */
  validation?: (value: string | string[]) => boolean;
}

export default function Onboarding() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  // Define questions based on role
  const getQuestions = (role?: string): Question[] => {
    const commonQuestions: Question[] = [
      {
        id: 'role',
        type: 'role-select',
        question: 'How do you want to help?',
        subtext: 'Select the role that best describes you.',
        options: [
          { label: 'Distributor', value: 'donor', icon: 'fa-store' },
          { label: 'Volunteer', value: 'volunteer', icon: 'fa-truck' },
          { label: 'Food Bank', value: 'foodbank', icon: 'fa-heart' },
        ]
      },
      {
        id: 'phoneNumber',
        type: 'text',
        question: 'What is your phone number?',
        subtext: 'We need this for real-time logistics coordination.',
        placeholder: '(555) 123-4567',
        validation: (val) => {
          if (typeof val !== 'string') return false;
          // Remove common formatting characters
          const cleaned = val.replace(/[\s\-\(\)]/g, '');
          // Check if it's a valid length and contains only digits (optionally with + prefix)
          return /^\+?\d{10,15}$/.test(cleaned);
        }
      }
    ];

    if (!role) return [commonQuestions[0]];

    const roleSpecific: Record<string, Question[]> = {
      donor: [
        {
          id: 'organizationName',
          type: 'text',
          question: 'What is the name of your business?',
          placeholder: 'e.g. Joe\'s Bakery'
        },
        {
          id: 'businessType',
          type: 'select',
          question: 'What type of establishment is this?',
          options: [
            { label: 'Grocery Store', value: 'grocery' },
            { label: 'Restaurant', value: 'restaurant' },
            { label: 'Farm', value: 'farm' },
            { label: 'Bakery', value: 'bakery' },
            { label: 'Cafe', value: 'cafe' },
            { label: 'Other', value: 'other' },
          ]
        },
        {
          id: 'pickupAddress',
          type: 'address',
          question: 'Where should volunteers go for pickups?',
          placeholder: 'Full address including unit number'
        },
        {
          id: 'accessInstructions',
          type: 'text',
          question: 'Any specific instructions for drivers?',
          placeholder: 'e.g. Go to loading dock B, ring back doorbell'
        }
      ],
      volunteer: [
        {
          id: 'vehicleType',
          type: 'select',
          question: 'What vehicle will you use?',
          options: [
            { label: 'Sedan', value: 'sedan' },
            { label: 'SUV', value: 'suv' },
            { label: 'Van', value: 'van' },
            { label: 'Truck', value: 'truck' },
            { label: 'Bicycle', value: 'bicycle' },
            { label: 'On Foot', value: 'foot' },
          ]
        },
        {
          id: 'baseLocation',
          type: 'address',
          question: 'What is your address?',
          placeholder: 'e.g. 123 Main St, City, Province'
        },
        {
          id: 'availability',
          type: 'multiselect',
          question: 'When are you generally available?',
          options: [
            { label: 'Weekdays (Morning)', value: 'weekdays_morning' },
            { label: 'Weekdays (Evening)', value: 'weekdays_evening' },
            { label: 'Weekends', value: 'weekends' },
            { label: 'Flexible', value: 'flexible' },
          ]
        }
      ],
      foodbank: [
        {
          id: 'organizationName',
          type: 'text',
          question: 'What is the name of your organization?',
          placeholder: 'e.g. St. Mary\'s Food Bank'
        },
        {
          id: 'dropoffAddress',
          type: 'address',
          question: 'Where should donations be delivered?',
          placeholder: 'Full address'
        },
        {
          id: 'receivingHours',
          type: 'text',
          question: 'What are your standard receiving hours?',
          placeholder: 'e.g. Mon-Fri 9am-5pm'
        },
        {
          id: 'storageCapabilities',
          type: 'multiselect',
          question: 'Do you have cold storage available?',
          options: [
            { label: 'Refrigerator', value: 'fridge' },
            { label: 'Freezer', value: 'freezer' },
            { label: 'Dry Storage Only', value: 'dry_storage' },
          ]
        }
      ]
    };

    return [commonQuestions[0], commonQuestions[1], ...roleSpecific[role]];
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        // Real-time listener for user profile updates
        const docRef = doc(db, "users", u.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.onboardingCompleted) {
              // Redirect if already completed
              router.push(getRoleRoute(data.role));
            } else {
              // Pre-fill existing data
              setFormData(data);
            }
          }
          setLoading(false);
        });
      } else {
        router.push('/');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, [router]);

  const questions = getQuestions(formData.role as string);
  const currentQ = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleNext = async () => {
    // Validate current step if validation function exists
    if (currentQ.validation) {
      const isValid = currentQ.validation(formData[currentQ.id] as string | string[]);
      if (!isValid) {
        // You might want to show an error message here
        alert("Please enter a valid value.");
        return;
      }
    }

    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateField = (value: string | string[]) => {
    setFormData({ ...formData, [currentQ.id]: value });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const finalData = {
        ...formData,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        onboardingCompleted: true,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "users", user.uid), finalData, { merge: true });
      
      // Redirect based on role
      router.push(getRoleRoute(formData.role as string));
      
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-nb-bg flex flex-col relative">
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={handleLogout}
          className="text-slate-500 hover:text-nb-ink font-bold px-4 py-2 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200">
        <div 
          className="h-full bg-nb-ink transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="space-y-2 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-nb-ink">
              {currentQ.question}
            </h1>
            {currentQ.subtext && (
              <p className="text-slate-500 text-lg">{currentQ.subtext}</p>
            )}
          </div>

          <div className="py-8">
            {/* Role Selection */}
            {currentQ.type === 'role-select' && (
              <div className="grid gap-4 md:grid-cols-3">
                {currentQ.options?.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      updateField(opt.value);
                      // Auto advance for role select
                      setTimeout(() => setCurrentStep(prev => prev + 1), 200);
                    }}
                    className={`p-6 rounded-2xl border-2 transition-all text-left hover:-translate-y-1 ${
                      formData[currentQ.id] === opt.value
                        ? 'border-nb-ink bg-nb-ink text-white shadow-lg'
                        : 'border-slate-200 bg-white hover:border-nb-ink text-nb-ink'
                    }`}
                  >
                    <div className="text-2xl mb-3">
                      <i className={`fas ${opt.icon}`}></i>
                    </div>
                    <div className="font-bold text-lg">{opt.label}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Text Input */}
            {currentQ.type === 'text' && (
              <input
                type="text"
                value={(formData[currentQ.id] as string) || ''}
                onChange={(e) => updateField(e.target.value)}
                placeholder={currentQ.placeholder}
                className="w-full text-2xl p-4 border-b-2 border-slate-300 focus:border-nb-ink bg-transparent outline-none transition-colors placeholder:text-slate-300"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData[currentQ.id]) handleNext();
                }}
              />
            )}

            {/* Address Input */}
            {currentQ.type === 'address' && (
              <AddressAutocomplete
                value={(formData[currentQ.id] as string) || ''}
                onChange={(val, lat, lng) => {
                  const updates: any = { [currentQ.id]: val };
                  if (lat && lng) {
                    updates.location = { lat, lng, address: val };
                  }
                  setFormData(prev => ({ ...prev, ...updates }));
                }}
                placeholder={currentQ.placeholder}
                className="w-full text-2xl p-4 border-b-2 border-slate-300 focus:border-nb-ink bg-transparent outline-none transition-colors placeholder:text-slate-300"
              />
            )}

            {/* Select Input */}
            {currentQ.type === 'select' && (
              <div className="grid gap-3">
                {currentQ.options?.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateField(opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData[currentQ.id] === opt.value
                        ? 'border-nb-ink bg-nb-ink text-white'
                        : 'border-slate-200 bg-white hover:border-nb-ink'
                    }`}
                  >
                    <span className="font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Multi-Select Input */}
            {currentQ.type === 'multiselect' && (
              <div className="grid gap-3">
                {currentQ.options?.map((opt) => {
                  const currentVal = formData[currentQ.id];
                  const selected = Array.isArray(currentVal) && currentVal.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const current = (formData[currentQ.id] as string[]) || [];
                        const updated = selected
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value];
                        updateField(updated);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center ${
                        selected
                          ? 'border-nb-ink bg-nb-ink text-white'
                          : 'border-slate-200 bg-white hover:border-nb-ink'
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      {selected && <i className="fas fa-check"></i>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-6 py-3 font-bold text-slate-500 hover:text-nb-ink transition-colors ${
                currentStep === 0 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!formData[currentQ.id] || (Array.isArray(formData[currentQ.id]) && formData[currentQ.id].length === 0) || saving}
              className="bg-nb-ink text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? 'Saving...' : currentStep === questions.length - 1 ? 'Complete' : 'Next'}
              {!saving && <i className="fas fa-arrow-right"></i>}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
