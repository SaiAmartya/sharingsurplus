"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection } from "firebase/firestore";
import { DistributionSession, DistributionLog, IngredientUsage } from "@/types/schema";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/lib/auth-helpers";

export default function DistributionCountingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<DistributionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialMealCount, setInitialMealCount] = useState<number>(0);
  const [finalMealCount, setFinalMealCount] = useState<number>(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [step, setStep] = useState<'initial' | 'final' | 'confirm'>('initial');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !sessionId) return;

    const fetchSession = async () => {
      try {
        const docRef = doc(db, "distributions", sessionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as DistributionSession;
          
          // Verify this session belongs to current user's food bank
          if (data.foodBankId !== user.uid) {
            alert("Access denied: This distribution session belongs to another food bank.");
            router.push("/charity/dashboard");
            return;
          }

          setSession(data);
          
          // If session already has counts, populate them
          if (data.initialMealCount) {
            setInitialMealCount(data.initialMealCount);
            // If initial count exists but no final count, stay on initial step but show the value
            if (data.finalMealCount === undefined) {
              setStep('initial');
            } else {
              setStep('final');
            }
          }
          if (data.finalMealCount !== undefined) {
            setFinalMealCount(data.finalMealCount);
            setStep('confirm');
          }
        } else {
          alert("Distribution session not found.");
          router.push("/charity/dashboard");
        }
      } catch (error) {
        console.error("Error fetching distribution session:", error);
        alert("Failed to load distribution session.");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [user, sessionId, router]);

  const handleSetInitialCount = async () => {
    if (initialMealCount <= 0) {
      alert("Please enter a valid initial meal count.");
      return;
    }

    try {
      const sessionRef = doc(db, "distributions", sessionId);
      await updateDoc(sessionRef, {
        initialMealCount,
      });

      // Log the action
      const logData: Omit<DistributionLog, 'id'> = {
        foodBankId: user.uid,
        distributionSessionId: sessionId,
        action: 'counting_completed',
        performedBy: user.uid,
        performedByName: (await getUserProfile(user.uid))?.displayName || user.email || 'Unknown',
        performedAt: Timestamp.now(),
        notes: `Initial meal count set to ${initialMealCount}`,
      };
      await addDoc(collection(db, "distribution_logs"), logData);

      setStep('final');
    } catch (error) {
      console.error("Error saving initial count:", error);
      alert("Failed to save initial count. Please try again.");
    }
  };

  const handleSetFinalCount = async () => {
    if (finalMealCount < 0) {
      alert("Final count cannot be negative.");
      return;
    }

    if (finalMealCount > initialMealCount) {
      alert("Final count cannot be greater than initial count.");
      return;
    }

    try {
      const distributedCount = initialMealCount - finalMealCount;
      
      const sessionRef = doc(db, "distributions", sessionId);
      await updateDoc(sessionRef, {
        finalMealCount,
        distributedMealCount: distributedCount,
      });

      setStep('confirm');
    } catch (error) {
      console.error("Error saving final count:", error);
      alert("Failed to save final count. Please try again.");
    }
  };

  const handleCompleteDistribution = async () => {
    if (!session) return;

    setIsCompleting(true);

    try {
      const distributedCount = initialMealCount - finalMealCount;
      const userProfile = await getUserProfile(user.uid);
      const userName = userProfile?.displayName || user.email || 'Unknown';
      
      // Calculate ingredient usage based on distributed meal count
      const plannedServings = parseInt(session.plannedServings.split(' ')[0] || '1');
      const usageRatio = distributedCount / plannedServings;

      const updates: { itemId: string; oldQty: number; newQty: number; productName: string }[] = [];
      const updatedIngredientUsage = [];

      // Process each ingredient and update inventory directly (client-side with user auth)
      for (const ingredient of session.ingredientUsage) {
        const actualQuantityNeeded = Math.ceil(ingredient.expectedQuantity * usageRatio);
        
        const updatedIngredient: any = {
          ...ingredient,
          actualQuantity: actualQuantityNeeded,
          deductedFromInventory: false,
          deductedAt: undefined,
          variance: 0,
          variancePercentage: 0,
        };

        // If ingredient is matched to inventory, deduct from inventory
        if (ingredient.inventoryItemId) {
          try {
            const inventoryRef = doc(db, "inventory", ingredient.inventoryItemId);
            const inventorySnap = await getDoc(inventoryRef);

            if (inventorySnap.exists()) {
              const inventoryItem = { id: inventorySnap.id, ...inventorySnap.data() } as any;

              // Determine how much to deduct (never go below zero)
              const deductionAmount = Math.min(actualQuantityNeeded, inventoryItem.quantity);

              if (deductionAmount > 0) {
                const newQuantity = Math.max(0, inventoryItem.quantity - deductionAmount);
                const newDistributedTotal = (inventoryItem.distributedQuantity || 0) + deductionAmount;

                // Update inventory
                await updateDoc(inventoryRef, {
                  quantity: newQuantity,
                  distributedQuantity: newDistributedTotal,
                });

                updates.push({
                  itemId: inventoryItem.id!,
                  oldQty: inventoryItem.quantity,
                  newQty: newQuantity,
                  productName: inventoryItem.productName,
                });

                // Mark as deducted
                updatedIngredient.deductedFromInventory = true;
                updatedIngredient.deductedAt = Timestamp.now();

                // Calculate variance
                const variance = actualQuantityNeeded - deductionAmount;
                updatedIngredient.variance = variance;
                updatedIngredient.variancePercentage = 
                  ingredient.expectedQuantity > 0 
                    ? (variance / ingredient.expectedQuantity) * 100 
                    : 0;
              }
            }
          } catch (invError) {
            console.error(`Error updating inventory item ${ingredient.inventoryItemId}:`, invError);
          }
        }

        updatedIngredientUsage.push(updatedIngredient);
      }

      // Update distribution session
      const hasVariance = updatedIngredientUsage.some((ing: any) => 
        ing.variance !== undefined && Math.abs(ing.variance) > 0
      );

      const sessionRef = doc(db, "distributions", sessionId);
      await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
        completedBy: user.uid,
        completedByName: userName,
        ingredientUsage: updatedIngredientUsage,
        hasVariance,
      });

      // Log the completion
      await addDoc(collection(db, "distribution_logs"), {
        foodBankId: user.uid,
        distributionSessionId: sessionId,
        action: 'session_started',
        performedBy: user.uid,
        performedByName: userName,
        performedAt: Timestamp.now(),
        notes: `Distribution completed. ${distributedCount} meals distributed.`,
      });

      // Log each inventory deduction
      for (const update of updates) {
        await addDoc(collection(db, "distribution_logs"), {
          foodBankId: user.uid,
          distributionSessionId: sessionId,
          action: 'inventory_deducted',
          inventoryItemId: update.itemId,
          productName: update.productName,
          quantityBefore: update.oldQty,
          quantityAfter: update.newQty,
          quantityChanged: update.oldQty - update.newQty,
          performedBy: user.uid,
          performedByName: userName,
          performedAt: Timestamp.now(),
          notes: `Inventory deducted for distribution`,
        });
      }

      alert(`Distribution completed! ${distributedCount} meals served.`);
      router.push('/charity/dashboard');
    } catch (error: any) {
      console.error("Error completing distribution:", error);
      alert(error.message || "Failed to complete distribution. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this distribution? No inventory will be deducted.")) {
      return;
    }

    try {
      const sessionRef = doc(db, "distributions", sessionId);
      await updateDoc(sessionRef, {
        status: 'cancelled',
      });

      // Log the cancellation
      const userProfile = await getUserProfile(user.uid);
      const logData: Omit<DistributionLog, 'id'> = {
        foodBankId: user.uid,
        distributionSessionId: sessionId,
        action: 'session_cancelled',
        performedBy: user.uid,
        performedByName: userProfile?.displayName || user.email || 'Unknown',
        performedAt: Timestamp.now(),
        notes: 'Distribution cancelled by user',
      };
      await addDoc(collection(db, "distribution_logs"), logData);

      router.push('/charity/dashboard');
    } catch (error) {
      console.error("Error cancelling distribution:", error);
      alert("Failed to cancel distribution.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-nb-teal mb-4"></i>
          <p className="text-slate-600">Loading distribution session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const distributedCount = initialMealCount - finalMealCount;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-nb-ink mb-2">
          Distribution Tracking
        </h1>
        <p className="text-slate-600">
          Track meal distribution for: <strong>{session.recipeName}</strong>
        </p>
      </div>

      {/* Progress Steps - Neo-Bauhaus Route Line */}
      <div className="mb-8 bg-white rounded-3xl p-8 shadow-float relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-10 -mt-10"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          {/* Step 1 */}
          <div className={`flex flex-col items-center relative z-10 transition-opacity duration-300 ${step === 'initial' ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-3 transition-all duration-300 shadow-lg ${
              step === 'initial' ? 'bg-nb-teal text-white scale-110 ring-4 ring-nb-teal/20' : 
              step === 'final' || step === 'confirm' ? 'bg-nb-teal text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {step === 'final' || step === 'confirm' ? <i className="fas fa-check"></i> : '1'}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-nb-ink">Initial Count</p>
          </div>

          {/* Connector 1 */}
          <div className="flex-1 h-3 bg-slate-100 mx-4 rounded-full overflow-hidden">
            <div className={`h-full bg-nb-teal transition-all duration-500 ease-out rounded-full ${
              step === 'final' || step === 'confirm' ? 'w-full' : 'w-0'
            }`}></div>
          </div>

          {/* Step 2 */}
          <div className={`flex flex-col items-center relative z-10 transition-opacity duration-300 ${step === 'final' ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-3 transition-all duration-300 shadow-lg ${
              step === 'final' ? 'bg-nb-teal text-white scale-110 ring-4 ring-nb-teal/20' : 
              step === 'confirm' ? 'bg-nb-teal text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {step === 'confirm' ? <i className="fas fa-check"></i> : '2'}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-nb-ink">Final Count</p>
          </div>

          {/* Connector 2 */}
          <div className="flex-1 h-3 bg-slate-100 mx-4 rounded-full overflow-hidden">
            <div className={`h-full bg-nb-teal transition-all duration-500 ease-out rounded-full ${
              step === 'confirm' ? 'w-full' : 'w-0'
            }`}></div>
          </div>

          {/* Step 3 */}
          <div className={`flex flex-col items-center relative z-10 transition-opacity duration-300 ${step === 'confirm' ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-3 transition-all duration-300 shadow-lg ${
              step === 'confirm' ? 'bg-nb-teal text-white scale-110 ring-4 ring-nb-teal/20' : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-nb-ink">Confirm</p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-3xl p-8 shadow-float relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-nb-teal"></div>

        {step === 'initial' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-display text-3xl font-bold text-nb-ink mb-2">
              Step 1: Initial Meal Count
            </h2>
            <p className="text-slate-500 mb-8 text-lg">
              How many meal plans are you starting with for this distribution?
            </p>

            {initialMealCount > 0 && (
              <div className="mb-8 p-6 bg-nb-teal rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                    <i className="fas fa-robot"></i>
                  </div>
                  <div>
                    <p className="font-bold text-teal-100 text-sm uppercase tracking-wider mb-1">AI Suggestion</p>
                    <p className="text-lg font-medium leading-relaxed">
                      Based on your inventory, you can prepare up to <strong className="text-white text-2xl mx-1">{initialMealCount}</strong> meals.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
                Initial Meal Count
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={initialMealCount || ''}
                  onChange={(e) => setInitialMealCount(parseInt(e.target.value) || 0)}
                  className="w-full px-6 py-5 bg-slate-100 border-2 border-transparent rounded-2xl focus:bg-white focus:border-nb-teal focus:ring-4 focus:ring-nb-teal/10 text-3xl font-display font-bold text-nb-ink placeholder:text-slate-300 transition-all outline-none"
                  placeholder="0"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  meals
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3 ml-1 flex items-center gap-2">
                <i className="fas fa-info-circle"></i>
                {initialMealCount > 0 
                  ? "You can adjust this number based on actual preparation."
                  : "Enter the number of meal portions you're planning to distribute."
                }
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSetInitialCount}
                disabled={initialMealCount <= 0}
                className="flex-1 bg-nb-ink hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg"
              >
                Continue
                <i className="fas fa-arrow-right"></i>
              </button>
              <button
                onClick={handleCancel}
                className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'final' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-display text-3xl font-bold text-nb-ink mb-2">
              Step 2: Final Meal Count
            </h2>
            <p className="text-slate-500 mb-8 text-lg">
              After distribution, how many meal plans are left?
            </p>

            <div className="bg-slate-50 p-6 rounded-2xl mb-8 flex items-center justify-between border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Starting With</p>
                <p className="text-3xl font-display font-bold text-nb-ink">{initialMealCount}</p>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
                Remaining Meals (Leftover)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={initialMealCount}
                  value={finalMealCount || ''}
                  onChange={(e) => setFinalMealCount(parseInt(e.target.value) || 0)}
                  className="w-full px-6 py-5 bg-slate-100 border-2 border-transparent rounded-2xl focus:bg-white focus:border-nb-teal focus:ring-4 focus:ring-nb-teal/10 text-3xl font-display font-bold text-nb-ink placeholder:text-slate-300 transition-all outline-none"
                  placeholder="0"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  meals
                </div>
              </div>
            </div>

            {finalMealCount >= 0 && (
              <div className="bg-white border border-nb-teal p-6 rounded-2xl mb-8 flex items-center gap-4">
                <div className="w-12 h-12 bg-nb-teal rounded-full flex items-center justify-center text-white text-xl shrink-0">
                  <i className="fas fa-check"></i>
                </div>
                <div>
                  <p className="text-nb-ink font-bold text-lg">
                    Total Distributed: {initialMealCount - finalMealCount} Meals
                  </p>
                  <p className="text-slate-500 text-sm">This amount will be deducted from inventory.</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleSetFinalCount}
                disabled={finalMealCount < 0 || finalMealCount > initialMealCount}
                className="flex-1 bg-nb-ink hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg"
              >
                Review & Confirm
                <i className="fas fa-arrow-right"></i>
              </button>
              <button
                onClick={() => setStep('initial')}
                className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <i className="fas fa-arrow-left"></i>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-display text-3xl font-bold text-nb-ink mb-2">
              Step 3: Confirm & Complete
            </h2>
            <p className="text-slate-500 mb-8 text-lg">
              Review the distribution details before completing.
            </p>

            <div className="space-y-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recipe</p>
                <p className="font-display text-2xl font-bold text-nb-ink">{session.recipeName}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl text-center border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">INITIAL</p>
                  <p className="text-4xl font-display font-bold text-nb-blue">{initialMealCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl text-center border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">REMAINING</p>
                  <p className="text-4xl font-display font-bold text-nb-red">{finalMealCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl text-center border border-nb-teal shadow-sm ring-4 ring-nb-teal/5">
                  <p className="text-xs text-nb-teal font-bold uppercase tracking-wider mb-2">DISTRIBUTED</p>
                  <p className="text-4xl font-display font-bold text-nb-teal">{distributedCount}</p>
                </div>
              </div>

              <div className="bg-white border border-orange-200 p-6 rounded-2xl flex gap-4">
                <i className="fas fa-info-circle text-orange-500 text-xl mt-1"></i>
                <div>
                  <p className="text-orange-900 font-bold mb-1">Inventory Update</p>
                  <p className="text-sm text-orange-800/80 leading-relaxed">
                    Completing this distribution will automatically deduct the calculated ingredient amounts from your inventory.
                    Quantities will never drop below zero.
                  </p>
                </div>
              </div>

              {/* Show ingredients that will be deducted */}
              <div className="border border-slate-200 rounded-2xl p-6">
                <h3 className="font-bold text-nb-ink mb-4 flex items-center gap-2">
                  <i className="fas fa-clipboard-list text-slate-400"></i>
                  Deduction Summary
                </h3>
                <div className="space-y-3">
                  {session.ingredientUsage.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-700 font-medium">{ing.productName}</span>
                      <span className="font-bold text-nb-ink bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">
                        - {Math.ceil((ing.expectedQuantity * distributedCount) / parseInt(session.plannedServings.split(' ')[0] || '1'))} {ing.expectedUnit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCompleteDistribution}
                disabled={isCompleting}
                className="flex-1 bg-nb-teal hover:bg-teal-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {isCompleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Complete Distribution
                  </>
                )}
              </button>
              <button
                onClick={() => setStep('final')}
                disabled={isCompleting}
                className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <i className="fas fa-arrow-left"></i>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
