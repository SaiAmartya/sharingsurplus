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

      {/* Progress Steps */}
      <div className="mb-8 bg-white rounded-2xl p-6 shadow-float">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex-1 text-center ${step === 'initial' ? 'text-nb-teal' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
              step === 'initial' ? 'bg-nb-teal text-white' : step === 'final' || step === 'confirm' ? 'bg-green-500 text-white' : 'bg-slate-200'
            }`}>
              {step === 'final' || step === 'confirm' ? <i className="fas fa-check"></i> : '1'}
            </div>
            <p className="text-xs font-bold">Initial Count</p>
          </div>
          <div className="flex-1 h-1 bg-slate-200 mx-2">
            <div className={`h-full transition-all ${step === 'final' || step === 'confirm' ? 'bg-nb-teal w-full' : 'w-0'}`}></div>
          </div>
          <div className={`flex-1 text-center ${step === 'final' ? 'text-nb-teal' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
              step === 'final' ? 'bg-nb-teal text-white' : step === 'confirm' ? 'bg-green-500 text-white' : 'bg-slate-200'
            }`}>
              {step === 'confirm' ? <i className="fas fa-check"></i> : '2'}
            </div>
            <p className="text-xs font-bold">Final Count</p>
          </div>
          <div className="flex-1 h-1 bg-slate-200 mx-2">
            <div className={`h-full transition-all ${step === 'confirm' ? 'bg-nb-teal w-full' : 'w-0'}`}></div>
          </div>
          <div className={`flex-1 text-center ${step === 'confirm' ? 'text-nb-teal' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
              step === 'confirm' ? 'bg-nb-teal text-white' : 'bg-slate-200'
            }`}>
              3
            </div>
            <p className="text-xs font-bold">Confirm</p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl p-8 shadow-float">
        {step === 'initial' && (
          <div>
            <h2 className="font-display text-2xl font-bold text-nb-ink mb-4">
              Step 1: Initial Meal Count
            </h2>
            <p className="text-slate-600 mb-6">
              How many meal plans are you starting with for this distribution?
            </p>

            {initialMealCount > 0 && (
              <div className="mb-4 p-4 bg-nb-teal-soft border-2 border-nb-teal rounded-xl">
                <p className="text-sm text-nb-teal font-bold mb-1">
                  <i className="fas fa-robot mr-2"></i>
                  AI-Suggested Count
                </p>
                <p className="text-xs text-slate-600">
                  Based on your current inventory, you can prepare up to <strong>{initialMealCount} meals</strong> with this recipe.
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-bold text-nb-ink mb-2">
                Initial Meal Count
              </label>
              <input
                type="number"
                min="1"
                value={initialMealCount || ''}
                onChange={(e) => setInitialMealCount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-nb-teal text-lg"
                placeholder="e.g., 100"
              />
              <p className="text-xs text-slate-500 mt-2">
                {initialMealCount > 0 
                  ? "You can adjust this number based on actual preparation."
                  : "Enter the number of meal portions you're planning to distribute."
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSetInitialCount}
                disabled={initialMealCount <= 0}
                className="flex-1 bg-nb-teal hover:bg-nb-teal/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-float disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Final Count
                <i className="fas fa-arrow-right ml-2"></i>
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'final' && (
          <div>
            <h2 className="font-display text-2xl font-bold text-nb-ink mb-4">
              Step 2: Final Meal Count
            </h2>
            <p className="text-slate-600 mb-6">
              After distribution, how many meal plans are left?
            </p>

            <div className="bg-nb-teal-soft p-4 rounded-xl mb-6">
              <p className="text-sm text-nb-ink">
                <strong>Initial Count:</strong> {initialMealCount} meals
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-nb-ink mb-2">
                Final Meal Count (Remaining)
              </label>
              <input
                type="number"
                min="0"
                max={initialMealCount}
                value={finalMealCount || ''}
                onChange={(e) => setFinalMealCount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-nb-teal text-lg"
                placeholder="e.g., 5"
              />
              <p className="text-xs text-slate-500 mt-2">
                Enter how many meal portions were not distributed (leftover).
              </p>
            </div>

            {finalMealCount >= 0 && (
              <div className="bg-green-50 border-2 border-green-300 p-4 rounded-xl mb-6">
                <p className="text-green-800 font-bold">
                  <i className="fas fa-calculator mr-2"></i>
                  Meals Distributed: {initialMealCount - finalMealCount}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSetFinalCount}
                disabled={finalMealCount < 0 || finalMealCount > initialMealCount}
                className="flex-1 bg-nb-teal hover:bg-nb-teal/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-float disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Confirmation
                <i className="fas fa-arrow-right ml-2"></i>
              </button>
              <button
                onClick={() => setStep('initial')}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <h2 className="font-display text-2xl font-bold text-nb-ink mb-4">
              Step 3: Confirm & Complete
            </h2>
            <p className="text-slate-600 mb-6">
              Review the distribution details before completing.
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-600 mb-1">Recipe</p>
                <p className="font-bold text-lg text-nb-ink">{session.recipeName}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl text-center">
                  <p className="text-xs text-blue-600 font-bold mb-1">INITIAL</p>
                  <p className="text-2xl font-display font-bold text-blue-900">{initialMealCount}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl text-center">
                  <p className="text-xs text-red-600 font-bold mb-1">REMAINING</p>
                  <p className="text-2xl font-display font-bold text-red-900">{finalMealCount}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl text-center">
                  <p className="text-xs text-green-600 font-bold mb-1">DISTRIBUTED</p>
                  <p className="text-2xl font-display font-bold text-green-900">{distributedCount}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-xl">
                <p className="text-sm text-yellow-800">
                  <i className="fas fa-info-circle mr-2"></i>
                  <strong>Important:</strong> Completing this distribution will automatically deduct
                  the calculated ingredient amounts from your inventory based on the number of meals distributed.
                  Inventory quantities will never go below zero.
                </p>
              </div>

              {/* Show ingredients that will be deducted */}
              <div className="border-2 border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-nb-ink mb-3">Ingredients to be Deducted:</h3>
                <div className="space-y-2">
                  {session.ingredientUsage.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700">{ing.productName}</span>
                      <span className="font-bold text-nb-ink">
                        {Math.ceil((ing.expectedQuantity * distributedCount) / parseInt(session.plannedServings.split(' ')[0] || '1'))} {ing.expectedUnit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCompleteDistribution}
                disabled={isCompleting}
                className="flex-1 bg-nb-teal hover:bg-nb-teal/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-float disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Completing...
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
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
