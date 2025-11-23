"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, Timestamp, addDoc, collection, runTransaction, getDoc } from "firebase/firestore";
import { SavedRecipe, DistributionSession, InventoryItem, StructuredIngredient, IngredientUsage, DistributionLog } from "@/types/schema";
import { getUserProfile } from "@/lib/auth-helpers";
import { matchAllIngredients, validateInventoryAvailability } from "@/lib/ingredient-matcher";

interface DistributionModalProps {
  recipe: SavedRecipe;
  activeSession?: DistributionSession | null;
  onClose: () => void;
  onComplete?: () => void;
  inventory: InventoryItem[];
}

export default function DistributionModal({ recipe, activeSession, onClose, onComplete, inventory }: DistributionModalProps) {
  const [step, setStep] = useState<'setup' | 'active' | 'complete'>('setup');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<DistributionSession | null>(activeSession || null);
  
  // Setup Step State
  const [matchedIngredients, setMatchedIngredients] = useState<StructuredIngredient[]>([]);
  const [initialMealCount, setInitialMealCount] = useState<number>(0);
  
  // Active Step State
  const [finalMealCount, setFinalMealCount] = useState<number>(0);
  
  // Complete Step State
  const [distributedCount, setDistributedCount] = useState(0);

  // Initialize based on props
  useEffect(() => {
    if (activeSession) {
      setStep('active');
      setSession(activeSession);
      setInitialMealCount(activeSession.initialMealCount || 0);
      
      // Initialize matched ingredients for reference if needed, though session has ingredientUsage
      if (recipe.recipe.ingredients && Array.isArray(recipe.recipe.ingredients)) {
         const matched = matchAllIngredients(
          recipe.recipe.ingredients as StructuredIngredient[],
          inventory
        );
        setMatchedIngredients(matched);
      }
    } else {
      // New distribution setup
      if (recipe.recipe.ingredients && Array.isArray(recipe.recipe.ingredients)) {
        const matched = matchAllIngredients(
          recipe.recipe.ingredients as StructuredIngredient[],
          inventory
        );
        setMatchedIngredients(matched);
      }
    }
  }, [activeSession, recipe, inventory]);

  // Calculate max meals for AI suggestion
  const calculateMaxMeals = (): number => {
    if (matchedIngredients.length === 0) return 0;

    const plannedServings = parseInt(recipe.recipe.servings.split(' ')[0] || '1');
    let minRatio = Infinity;

    for (const ingredient of matchedIngredients) {
      if (ingredient.inventoryItemId) {
        const inventoryItem = inventory.find(i => i.id === ingredient.inventoryItemId);
        if (inventoryItem) {
          const available = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0);
          const needed = ingredient.estimatedQuantity;
          
          if (needed > 0) {
            const ratio = available / needed;
            minRatio = Math.min(minRatio, ratio);
          }
        }
      }
    }

    if (minRatio === Infinity || minRatio <= 0) return 0;
    return Math.floor(minRatio * plannedServings);
  };
  
  // Auto-populate initial meal count suggestion
  useEffect(() => {
    if (step === 'setup' && !activeSession && initialMealCount === 0) {
        const max = calculateMaxMeals();
        if (max > 0) setInitialMealCount(max);
    }
  }, [matchedIngredients, step, activeSession]);

  const handleStartDistribution = async () => {
    if (initialMealCount <= 0 || !auth.currentUser) return;
    setLoading(true);

    try {
      const userProfile = await getUserProfile(auth.currentUser.uid);
      
      // Prepare ingredient usage
      const ingredientUsage: IngredientUsage[] = matchedIngredients.map(ing => ({
        productName: ing.productName,
        inventoryItemId: ing.inventoryItemId,
        barcode: ing.barcode,
        expectedQuantity: ing.estimatedQuantity,
        expectedUnit: ing.unit,
        deductedFromInventory: false,
      }));

      const distributionData: Omit<DistributionSession, 'id'> = {
        foodBankId: auth.currentUser.uid,
        recipeId: recipe.id!,
        recipeName: recipe.recipe.name,
        plannedServings: recipe.recipe.servings,
        status: 'active',
        ingredientUsage,
        startedBy: auth.currentUser.uid,
        startedByName: userProfile?.displayName || auth.currentUser.email || 'Unknown',
        startedAt: Timestamp.now(),
        initialMealCount: initialMealCount,
      };

      const docRef = await addDoc(collection(db, "distributions"), distributionData);
      
      // Log creation
       await addDoc(collection(db, "distribution_logs"), {
        foodBankId: auth.currentUser.uid,
        distributionSessionId: docRef.id,
        action: 'session_started',
        performedBy: auth.currentUser.uid,
        performedByName: userProfile?.displayName || 'Unknown',
        performedAt: Timestamp.now(),
        notes: `Distribution started with ${initialMealCount} meals planned`,
      });

      setSession({ id: docRef.id, ...distributionData });
      setStep('active');
    } catch (error) {
      console.error("Error starting distribution:", error);
      alert("Failed to start distribution");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDistribution = async () => {
    if (!session?.id || !auth.currentUser) return;
    if (finalMealCount < 0 || finalMealCount > initialMealCount) {
        alert("Invalid final meal count");
        return;
    }
    
    setLoading(true);
    try {
        const currentDistributedCount = initialMealCount - finalMealCount;
        setDistributedCount(currentDistributedCount);
        const userProfile = await getUserProfile(auth.currentUser.uid);
        const userName = userProfile?.displayName || auth.currentUser.email || 'Unknown';

        // Calculate usage ratio
        const plannedServings = parseInt(session.plannedServings.split(' ')[0] || '1');
        const usageRatio = currentDistributedCount / plannedServings;

        // Transaction to update inventory and close session
        await runTransaction(db, async (transaction) => {
            const sessionRef = doc(db, "distributions", session.id!);
            
            const updates: any[] = [];
            const updatedIngredientUsage: IngredientUsage[] = [];

            for (const ingredient of session.ingredientUsage) {
                const actualQuantityNeeded = Math.ceil(ingredient.expectedQuantity * usageRatio);
                
                const updatedIngredient: IngredientUsage = {
                    ...ingredient,
                    actualQuantity: actualQuantityNeeded,
                    deductedFromInventory: false,
                    variance: 0,
                    variancePercentage: 0,
                };

                if (ingredient.inventoryItemId) {
                    const inventoryRef = doc(db, "inventory", ingredient.inventoryItemId);
                    const inventorySnap = await transaction.get(inventoryRef);

                    if (inventorySnap.exists()) {
                        const item = inventorySnap.data() as InventoryItem;
                        const deduction = Math.min(actualQuantityNeeded, item.quantity);
                        
                        if (deduction > 0) {
                            const newQty = Math.max(0, item.quantity - deduction);
                            transaction.update(inventoryRef, {
                                quantity: newQty,
                                distributedQuantity: (item.distributedQuantity || 0) + deduction
                            });
                            
                            updatedIngredient.deductedFromInventory = true;
                            updatedIngredient.deductedAt = Timestamp.now();
                            
                            const variance = actualQuantityNeeded - deduction;
                            updatedIngredient.variance = variance;
                            
                            updates.push({
                                productName: item.productName,
                                oldQty: item.quantity,
                                newQty: newQty
                            });
                        }
                    }
                }
                updatedIngredientUsage.push(updatedIngredient);
            }

            const hasVariance = updatedIngredientUsage.some(ing => 
                ing.variance !== undefined && Math.abs(ing.variance) > 0
            );

            transaction.update(sessionRef, {
                status: 'completed',
                completedAt: Timestamp.now(),
                completedBy: auth.currentUser?.uid,
                completedByName: userName,
                finalMealCount,
                distributedMealCount: currentDistributedCount,
                ingredientUsage: updatedIngredientUsage,
                hasVariance
            });
        });
        
        // Add logs after transaction
        await addDoc(collection(db, "distribution_logs"), {
            foodBankId: auth.currentUser.uid,
            distributionSessionId: session.id,
            action: 'counting_completed',
            performedBy: auth.currentUser.uid,
            performedByName: userName,
            performedAt: Timestamp.now(),
            notes: `Distribution completed. ${currentDistributedCount} meals distributed.`
        });

        setStep('complete');
        if (onComplete) onComplete();
    } catch (error) {
        console.error("Error completing distribution:", error);
        alert("Failed to complete distribution");
    } finally {
        setLoading(false);
    }
  };

  const handleCancel = async () => {
      if (step === 'active' && session?.id) {
          if (!confirm("Cancel this active distribution?")) return;
          try {
            await updateDoc(doc(db, "distributions", session.id), {
                status: 'cancelled'
            });
          } catch (e) {
              console.error("Error cancelling", e);
          }
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
                <h2 className="font-display text-2xl font-bold text-nb-ink">
                    {step === 'setup' ? 'Start Distribution' : 
                     step === 'active' ? 'Active Distribution' : 'Distribution Complete'}
                </h2>
                <p className="text-slate-500 text-sm">{recipe.recipe.name}</p>
            </div>
            {step !== 'complete' && (
                <button onClick={handleCancel} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">
                    <i className="fas fa-times"></i>
                </button>
            )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            
            {step === 'setup' && (
                <div className="space-y-6">
                    {/* Ingredient Status */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <i className="fas fa-boxes"></i> Inventory Check
                        </h3>
                        <div className="space-y-2">
                            {matchedIngredients.map((ing, i) => {
                                const item = inventory.find(inv => inv.id === ing.inventoryItemId);
                                const validation = item ? validateInventoryAvailability(ing, item) : null;
                                return (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-700 font-medium">{ing.productName}</span>
                                        {item ? (
                                            validation?.isValid ? (
                                                <span className="text-nb-teal text-xs font-bold bg-white px-2 py-1 rounded border border-nb-teal/20">Ready</span>
                                            ) : (
                                                <span className="text-red-500 text-xs font-bold bg-white px-2 py-1 rounded border border-red-200">Low Stock</span>
                                            )
                                        ) : (
                                            <span className="text-orange-400 text-xs font-bold bg-white px-2 py-1 rounded border border-orange-200">Missing</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Initial Count Input */}
                    <div>
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Initial Meal Count
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                value={initialMealCount || ''}
                                onChange={(e) => setInitialMealCount(parseInt(e.target.value) || 0)}
                                className="w-full px-5 py-4 bg-slate-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-nb-teal focus:ring-4 focus:ring-nb-teal/10 text-2xl font-display font-bold text-nb-ink outline-none transition-all"
                                placeholder="0"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">meals</div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 ml-1">
                            <i className="fas fa-robot mr-1"></i> AI suggested based on inventory
                        </p>
                    </div>
                </div>
            )}

            {step === 'active' && (
                <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                    <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-800">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-500 shrink-0">
                            <i className="fas fa-sync fa-spin"></i>
                        </div>
                        <div>
                            <p className="font-bold text-sm">Distribution in Progress</p>
                            <p className="text-xs opacity-80">Started with {initialMealCount} meals</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Remaining Meals (Leftovers)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                max={initialMealCount}
                                value={finalMealCount || ''}
                                onChange={(e) => setFinalMealCount(parseInt(e.target.value) || 0)}
                                className="w-full px-5 py-4 bg-slate-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-nb-teal focus:ring-4 focus:ring-nb-teal/10 text-2xl font-display font-bold text-nb-ink outline-none transition-all"
                                placeholder="0"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">meals</div>
                        </div>
                    </div>

                    {finalMealCount >= 0 && initialMealCount - finalMealCount >= 0 && (
                         <div className="bg-nb-teal/5 border border-nb-teal/20 p-4 rounded-2xl text-center">
                            <p className="text-xs font-bold text-nb-teal uppercase tracking-wider mb-1">Total Distributed</p>
                            <p className="text-3xl font-display font-bold text-nb-ink">{initialMealCount - finalMealCount}</p>
                            <p className="text-xs text-slate-400 mt-1">Inventory will be deducted for this amount</p>
                        </div>
                    )}
                </div>
            )}

            {step === 'complete' && (
                 <div className="text-center py-8 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        <i className="fas fa-check"></i>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-nb-ink mb-2">Distribution Completed!</h3>
                    <p className="text-slate-500 mb-6">{distributedCount} meals were served and inventory has been updated.</p>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
            {step === 'setup' && (
                <>
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleStartDistribution}
                        disabled={loading || initialMealCount <= 0}
                        className="flex-[2] bg-nb-ink text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
                        Start Distribution
                    </button>
                </>
            )}

            {step === 'active' && (
                <>
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                        Close (Continue Later)
                    </button>
                    <button 
                        onClick={handleCompleteDistribution}
                        disabled={loading || finalMealCount < 0 || finalMealCount > initialMealCount}
                        className="flex-[2] bg-nb-teal text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                        Complete Distribution
                    </button>
                </>
            )}
             {step === 'complete' && (
                 <button onClick={onClose} className="w-full bg-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors">
                    Close
                 </button>
            )}
        </div>
      </div>
    </div>
  );
}

