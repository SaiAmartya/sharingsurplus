/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { getDistanceFromLatLonInKm } from "@/lib/location";
import { getUserProfile } from "@/lib/auth-helpers";
import { UserProfile, UrgentRequest, SavedRecipe, InventoryItem, StructuredIngredient, DistributionSession, IngredientUsage } from "@/types/schema";
import { onAuthStateChanged } from "firebase/auth";
import { matchAllIngredients, validateInventoryAvailability } from "@/lib/ingredient-matcher";
import { useRouter } from "next/navigation";

export default function CharityDashboard() {
  const [incomingRequests, setIncomingRequests] = useState<UrgentRequest[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [matchedIngredients, setMatchedIngredients] = useState<StructuredIngredient[]>([]);
  const [isCreatingDistribution, setIsCreatingDistribution] = useState(false);
  const [mealsServed, setMealsServed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "requests"),
      where("foodBankId", "==", user.uid),
      where("status", "==", "accepted")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UrgentRequest[];
      setIncomingRequests(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch saved recipes
  useEffect(() => {
    if (!user) return;

    const fetchRecipes = async () => {
      const q = query(
        collection(db, "saved_recipes"),
        where("foodBankId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedRecipe[];
      setSavedRecipes(recipes);
    };

    fetchRecipes();
  }, [user]);

  // Fetch inventory
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "inventory"),
      where("foodBankId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch meals served stat
  useEffect(() => {
    if (!user) return;

    const fetchMealsServed = async () => {
      const q = query(
        collection(db, "distributions"),
        where("foodBankId", "==", user.uid),
        where("status", "==", "completed")
      );
      const snapshot = await getDocs(q);
      
      let total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as DistributionSession;
        total += data.distributedMealCount || 0;
      });
      
      setMealsServed(total);
    };

    fetchMealsServed();
  }, [user]);

  const handleStartDistribution = () => {
    setShowDistributionModal(true);
  };

  const handleSelectRecipe = (recipe: SavedRecipe) => {
    setSelectedRecipe(recipe);
    
    // Match ingredients to inventory
    if (recipe.recipe.ingredients && Array.isArray(recipe.recipe.ingredients)) {
      const matched = matchAllIngredients(
        recipe.recipe.ingredients as StructuredIngredient[],
        inventory
      );
      setMatchedIngredients(matched);
    }
  };

  const calculateMaxMealsFromInventory = (): number => {
    if (!selectedRecipe || matchedIngredients.length === 0) return 0;

    const plannedServings = parseInt(selectedRecipe.recipe.servings.split(' ')[0] || '1');
    let minRatio = Infinity;

    // For each matched ingredient, calculate how many times we can make the recipe
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

    // If no matched ingredients or infinite ratio, return 0
    if (minRatio === Infinity || minRatio <= 0) return 0;

    // Calculate max meals: ratio * planned servings
    return Math.floor(minRatio * plannedServings);
  };

  const handleCreateDistribution = async () => {
    if (!selectedRecipe || !user) return;

    setIsCreatingDistribution(true);

    try {
      const userProfile = await getUserProfile(user.uid);
      
      // Prepare ingredient usage from matched ingredients
      const ingredientUsage: IngredientUsage[] = matchedIngredients.map(ing => ({
        productName: ing.productName,
        inventoryItemId: ing.inventoryItemId,
        barcode: ing.barcode,
        expectedQuantity: ing.estimatedQuantity,
        expectedUnit: ing.unit,
        deductedFromInventory: false,
      }));

      // Calculate suggested initial meal count
      const suggestedMealCount = calculateMaxMealsFromInventory();

      // Create distribution session
      const distributionData: Omit<DistributionSession, 'id'> = {
        foodBankId: user.uid,
        recipeId: selectedRecipe.id!,
        recipeName: selectedRecipe.recipe.name,
        plannedServings: selectedRecipe.recipe.servings,
        status: 'active',
        ingredientUsage,
        startedBy: user.uid,
        startedByName: userProfile?.displayName || user.email || 'Unknown',
        startedAt: Timestamp.now(),
        initialMealCount: suggestedMealCount > 0 ? suggestedMealCount : undefined,
      };

      const docRef = await addDoc(collection(db, "distributions"), distributionData);

      // Navigate to distribution counting page
      router.push(`/charity/distribution/${docRef.id}`);
    } catch (error) {
      console.error("Error creating distribution:", error);
      alert("Failed to start distribution. Please try again.");
    } finally {
      setIsCreatingDistribution(false);
    }
  };

  const handleMarkReceived = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: 'fulfilled'
      });
    } catch (error) {
      console.error("Error marking request as received:", error);
      alert("Failed to update status");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={handleStartDistribution}
          className="bg-nb-teal hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-float hover:shadow-float-lg flex items-center gap-2"
        >
          <i className="fas fa-play"></i>
          Start Distribution
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-blue rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-blue/20">
                  <i className="fas fa-weight-hanging"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Rescued</p>
                  <p className="font-display text-3xl font-bold text-nb-ink mt-1">1,240 <span className="text-base text-slate-400 font-sans font-medium">kg</span></p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-teal rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-teal/20">
                  <i className="fas fa-utensils"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Meals Served</p>
                  <p className="font-display text-3xl font-bold text-nb-teal mt-1">{mealsServed.toLocaleString()}</p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40 border-l-4 border-l-nb-red">
              <div className="w-10 h-10 bg-nb-red rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-red/20">
                  <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expiring (24h)</p>
                  <p className="font-display text-3xl font-bold text-nb-red mt-1">15 <span className="text-base text-slate-400 font-sans font-medium">items</span></p>
              </div>
          </div>
            <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-ink rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-nb-ink/20">
                  <i className="fas fa-truck"></i>
              </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Drivers</p>
                  <p className="font-display text-3xl font-bold text-nb-ink mt-1">12</p>
              </div>
          </div>
      </div>

      {/* Incoming Ticker */}
      <div className="bg-nb-ink rounded-3xl p-8 text-white shadow-float relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex justify-between items-end mb-6 relative z-10">
              <h3 className="font-display text-2xl font-bold">Incoming Logistics</h3>
              <span className="inline-flex items-center bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-nb-teal"><span className="w-2 h-2 bg-nb-teal rounded-full mr-2 animate-pulse"></span> Live Updates</span>
          </div>
          
          <div className="space-y-4 relative z-10">
              {incomingRequests.length > 0 ? (
                incomingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold mr-4">
                            {req.acceptedByName ? req.acceptedByName.charAt(0) : 'D'}
                          </div>
                          <div>
                              <p className="font-bold text-sm">{req.acceptedByName || 'Anonymous Donor'}</p>
                              <p className="text-xs text-slate-400">Bringing: {req.item}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-nb-teal font-bold text-xs tracking-wider hidden sm:block">ACCEPTED</span>
                        <button 
                            onClick={() => handleMarkReceived(req.id!)}
                            className="bg-white/10 hover:bg-nb-teal hover:text-nb-ink text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group"
                            title="Confirm delivery"
                        >
                            <i className="fas fa-check group-hover:scale-110 transition-transform"></i>
                            Received
                        </button>
                      </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No incoming deliveries at the moment.</p>
                </div>
              )}
          </div>
      </div>

      {/* Distribution Modal */}
      {showDistributionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header - Clean & Minimal */}
            <div className="bg-white p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-display text-3xl font-bold text-nb-ink mb-1">Start Distribution</h2>
                <p className="text-slate-500 font-medium">Select a meal plan to begin tracking inventory usage.</p>
              </div>
              <button
                onClick={() => {
                  setShowDistributionModal(false);
                  setSelectedRecipe(null);
                  setMatchedIngredients([]);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {!selectedRecipe ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-nb-ink text-lg">Saved Meal Plans</h3>
                    <span className="text-sm text-slate-400">{savedRecipes.length} available</span>
                  </div>
                  
                  {savedRecipes.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300 text-2xl">
                        <i className="fas fa-utensils"></i>
                      </div>
                      <p className="font-bold text-slate-500">No saved meal plans found.</p>
                      <p className="text-sm text-slate-400 mt-2">Create a meal plan first to start distribution.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedRecipes.map(recipe => (
                        <div
                          key={recipe.id}
                          onClick={() => handleSelectRecipe(recipe)}
                          className="group bg-white border border-slate-100 p-5 rounded-2xl cursor-pointer hover:shadow-float hover:border-nb-teal/30 transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-nb-teal transition-colors"></div>
                          
                          <div className="relative z-10">
                            <h3 className="font-display text-xl font-bold text-nb-ink mb-2 group-hover:text-nb-teal transition-colors">
                              {recipe.recipe.name}
                            </h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{recipe.recipe.description}</p>
                            
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                <i className="fas fa-users mr-2 text-nb-teal"></i>
                                {recipe.recipe.servings}
                              </span>
                              <span className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                <i className="fas fa-clock mr-2 text-slate-400"></i>
                                {recipe.recipe.prepTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-8">
                    <button
                      onClick={() => {
                        setSelectedRecipe(null);
                        setMatchedIngredients([]);
                      }}
                      className="text-slate-400 hover:text-nb-teal mb-4 flex items-center gap-2 text-sm font-bold transition-colors"
                    >
                      <i className="fas fa-arrow-left"></i>
                      Back to Recipes
                    </button>
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-3xl font-bold text-nb-ink mb-2">
                          {selectedRecipe.recipe.name}
                        </h3>
                        <p className="text-slate-600 max-w-2xl">{selectedRecipe.recipe.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-center bg-white border border-slate-200 text-slate-600 p-3 rounded-2xl min-w-[80px]">
                          <i className="fas fa-users mb-1 block text-nb-teal"></i>
                          <span className="font-bold text-sm">{selectedRecipe.recipe.servings}</span>
                        </div>
                        <div className="text-center bg-white border border-slate-200 text-slate-600 p-3 rounded-2xl min-w-[80px]">
                          <i className="fas fa-clock mb-1 block text-slate-400"></i>
                          <span className="font-bold text-sm">{selectedRecipe.recipe.prepTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ingredient Matching */}
                  <div className="mb-6">
                    <h4 className="font-display text-xl font-bold text-nb-ink mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-nb-ink text-white rounded-full flex items-center justify-center text-sm">1</span>
                      Inventory Check
                    </h4>
                    
                    {/* AI Calculated Max Meals - Softer Style */}
                    {matchedIngredients.some(ing => ing.inventoryItemId) && (
                      <div className="mb-6 p-6 bg-white border border-nb-teal rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-nb-teal/5 rounded-full -mr-10 -mt-10"></div>
                        
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="bg-nb-teal text-white px-2 py-1 rounded-lg text-xs font-bold">
                                <i className="fas fa-robot mr-1"></i> AI CALIBRATED
                              </span>
                            </div>
                            <p className="text-slate-500 font-medium text-sm max-w-xs">
                              Based on your lowest stock ingredient, we estimate you can serve:
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-5xl font-display font-bold leading-none mb-1 text-nb-teal">
                              {calculateMaxMealsFromInventory()}
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meals Possible</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {matchedIngredients.map((ing, idx) => {
                        const inventoryItem = inventory.find(i => i.id === ing.inventoryItemId);
                        const hasMatch = !!inventoryItem;
                        const validation = inventoryItem 
                          ? validateInventoryAvailability(ing, inventoryItem)
                          : null;

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl transition-all flex items-center justify-between group ${
                              !hasMatch
                                ? 'bg-white border border-orange-200'
                                : validation?.isValid
                                ? 'bg-white border border-slate-200 hover:border-nb-teal/30 hover:shadow-sm'
                                : 'bg-white border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                !hasMatch ? 'bg-orange-500 text-white' :
                                validation?.isValid ? 'bg-slate-100 text-slate-400 group-hover:bg-nb-teal group-hover:text-white transition-colors' :
                                'bg-red-500 text-white'
                              }`}>
                                <i className={`fas ${!hasMatch ? 'fa-question' : validation?.isValid ? 'fa-check' : 'fa-exclamation'}`}></i>
                              </div>
                              <div>
                                <p className="font-bold text-nb-ink">
                                  {ing.productName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded-md">{ing.estimatedQuantity} {ing.unit}</span>
                                  {hasMatch && validation && (
                                    <span className={`${validation.isValid ? 'text-slate-500' : 'text-red-500 font-bold'}`}>
                                      Available: {validation.available}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              {!hasMatch ? (
                                <span className="text-orange-500 text-xs font-bold bg-white border border-orange-200 px-3 py-1 rounded-full">
                                  Missing
                                </span>
                              ) : validation?.isValid ? (
                                <span className="text-nb-teal text-xs font-bold bg-white border border-nb-teal px-3 py-1 rounded-full">
                                  Ready
                                </span>
                              ) : (
                                <span className="text-red-500 text-xs font-bold bg-white border border-red-200 px-3 py-1 rounded-full">
                                  Low Stock
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {matchedIngredients.some(ing => !ing.inventoryItemId) && (
                      <div className="mt-4 p-4 bg-white border border-orange-200 rounded-2xl flex gap-3 items-start">
                        <i className="fas fa-info-circle text-orange-500 mt-1"></i>
                        <p className="text-sm text-orange-800">
                          <strong>Note:</strong> Some ingredients couldn't be automatically matched.
                          You can still proceed, but inventory won't be deducted for unmatched items.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {selectedRecipe && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => {
                    setShowDistributionModal(false);
                    setSelectedRecipe(null);
                    setMatchedIngredients([]);
                  }}
                  className="px-8 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDistribution}
                  disabled={isCreatingDistribution}
                  className="bg-nb-teal hover:bg-teal-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  {isCreatingDistribution ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating Session...
                    </>
                  ) : (
                    <>
                      Start Distribution
                      <i className="fas fa-arrow-right"></i>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

