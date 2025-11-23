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
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-nb-ink">Dashboard</h1>
        <button
          onClick={handleStartDistribution}
          className="bg-nb-teal hover:bg-nb-teal/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-float hover:shadow-float-lg flex items-center gap-2"
        >
          <i className="fas fa-play"></i>
          Start Distribution
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-blue-soft rounded-full flex items-center justify-center text-nb-blue mb-4">
                  <i className="fas fa-weight-hanging"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Rescued</p>
                  <p className="font-display text-3xl font-bold text-nb-ink mt-1">1,240 <span className="text-base text-slate-400 font-sans font-medium">kg</span></p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-nb-teal-soft rounded-full flex items-center justify-center text-nb-teal mb-4">
                  <i className="fas fa-utensils"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Meals Served</p>
                  <p className="font-display text-3xl font-bold text-nb-teal mt-1">{mealsServed.toLocaleString()}</p>
              </div>
          </div>
          <div className="nb-card p-6 flex flex-col justify-between h-40 border-l-4 border-l-nb-red">
              <div className="w-10 h-10 bg-nb-red-soft rounded-full flex items-center justify-center text-nb-red mb-4">
                  <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expiring (24h)</p>
                  <p className="font-display text-3xl font-bold text-nb-red mt-1">15 <span className="text-base text-slate-400 font-sans font-medium">items</span></p>
              </div>
          </div>
            <div className="nb-card p-6 flex flex-col justify-between h-40">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-float-lg">
            {/* Modal Header */}
            <div className="bg-nb-ink text-white p-6 flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold">Start Distribution</h2>
              <button
                onClick={() => {
                  setShowDistributionModal(false);
                  setSelectedRecipe(null);
                  setMatchedIngredients([]);
                }}
                className="text-white/80 hover:text-white text-2xl"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {!selectedRecipe ? (
                <>
                  <p className="text-slate-600 mb-4">Select a meal plan to begin distribution:</p>
                  
                  {savedRecipes.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <i className="fas fa-utensils text-4xl mb-4"></i>
                      <p>No saved meal plans found.</p>
                      <p className="text-sm mt-2">Create a meal plan first to start distribution.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedRecipes.map(recipe => (
                        <div
                          key={recipe.id}
                          onClick={() => handleSelectRecipe(recipe)}
                          className="nb-card p-4 cursor-pointer hover:shadow-float transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-display text-xl font-bold text-nb-ink mb-1">
                                {recipe.recipe.name}
                              </h3>
                              <p className="text-slate-600 text-sm mb-2">{recipe.recipe.description}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="bg-nb-teal-soft text-nb-teal px-2 py-1 rounded text-xs font-bold">
                                  <i className="fas fa-users mr-1"></i>
                                  {recipe.recipe.servings}
                                </span>
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                                  <i className="fas fa-clock mr-1"></i>
                                  {recipe.recipe.prepTime}
                                </span>
                              </div>
                            </div>
                            <i className="fas fa-chevron-right text-slate-400 ml-4"></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => {
                          setSelectedRecipe(null);
                          setMatchedIngredients([]);
                        }}
                        className="text-nb-blue hover:text-nb-blue/80"
                      >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Back
                      </button>
                    </div>
                    
                    <h3 className="font-display text-2xl font-bold text-nb-ink mb-2">
                      {selectedRecipe.recipe.name}
                    </h3>
                    <p className="text-slate-600 mb-4">{selectedRecipe.recipe.description}</p>
                    
                    <div className="flex gap-3 mb-4">
                      <span className="bg-nb-teal-soft text-nb-teal px-3 py-1 rounded-lg text-sm font-bold">
                        <i className="fas fa-users mr-1"></i>
                        {selectedRecipe.recipe.servings}
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold">
                        <i className="fas fa-clock mr-1"></i>
                        {selectedRecipe.recipe.prepTime}
                      </span>
                    </div>
                  </div>

                  {/* Ingredient Matching */}
                  <div className="mb-6">
                    <h4 className="font-bold text-lg text-nb-ink mb-3">Ingredient Inventory Check</h4>
                    
                    {/* AI Calculated Max Meals */}
                    {matchedIngredients.some(ing => ing.inventoryItemId) && (
                      <div className="mb-4 p-4 bg-nb-teal-soft border-2 border-nb-teal rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-nb-teal font-bold mb-1">
                              <i className="fas fa-calculator mr-2"></i>
                              AI-Calibrated Meal Estimate
                            </p>
                            <p className="text-xs text-slate-600">
                              Based on current inventory availability
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-display font-bold text-nb-teal">
                              {calculateMaxMealsFromInventory()}
                            </p>
                            <p className="text-xs text-slate-600">meals possible</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {matchedIngredients.map((ing, idx) => {
                        const inventoryItem = inventory.find(i => i.id === ing.inventoryItemId);
                        const hasMatch = !!inventoryItem;
                        const validation = inventoryItem 
                          ? validateInventoryAvailability(ing, inventoryItem)
                          : null;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 ${
                              !hasMatch
                                ? 'bg-yellow-50 border-yellow-300'
                                : validation?.isValid
                                ? 'bg-green-50 border-green-300'
                                : 'bg-red-50 border-red-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-bold text-sm text-nb-ink">
                                  {ing.productName}
                                </p>
                                <p className="text-xs text-slate-600">
                                  Needed: {ing.estimatedQuantity} {ing.unit}
                                </p>
                                {hasMatch && validation && (
                                  <p className="text-xs text-slate-600">
                                    Available: {validation.available} (Total: {inventoryItem.quantity})
                                  </p>
                                )}
                              </div>
                              <div className="ml-2">
                                {!hasMatch ? (
                                  <span className="text-yellow-600 text-xs font-bold">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Not Matched
                                  </span>
                                ) : validation?.isValid ? (
                                  <span className="text-green-600 text-xs font-bold">
                                    <i className="fas fa-check-circle mr-1"></i>
                                    Available
                                  </span>
                                ) : (
                                  <span className="text-red-600 text-xs font-bold">
                                    <i className="fas fa-times-circle mr-1"></i>
                                    Insufficient
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {matchedIngredients.some(ing => !ing.inventoryItemId) && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          <i className="fas fa-info-circle mr-1"></i>
                          <strong>Note:</strong> Some ingredients couldn't be automatically matched to inventory.
                          Distribution will proceed, but manual counting may be needed.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {selectedRecipe && (
              <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDistributionModal(false);
                    setSelectedRecipe(null);
                    setMatchedIngredients([]);
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDistribution}
                  disabled={isCreatingDistribution}
                  className="bg-nb-teal hover:bg-nb-teal/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-float disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingDistribution ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play"></i>
                      Start Distribution
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

