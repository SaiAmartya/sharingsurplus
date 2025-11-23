"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import { Recipe, StructuredIngredient } from '@/types/schema';

export default function MealPlansPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [view, setView] = useState<'generate' | 'saved'>('generate');
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      checkInventory();
      fetchSavedRecipes();
    }
  }, [user]);

  const checkInventory = async () => {
    if (!user) return;
    const q = query(collection(db, "inventory"), where("foodBankId", "==", user.uid));
    const snapshot = await getDocs(q);
    setInventoryCount(snapshot.size);
  };

  const fetchSavedRecipes = async () => {
    if (!user) return;
    const q = query(
      collection(db, "saved_recipes"), 
      where("foodBankId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    setSavedRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleSave = async () => {
    if (!user || !recipe) return;
    setSaving(true);
    try {
      if (currentRecipeId) {
        await updateDoc(doc(db, "saved_recipes", currentRecipeId), {
          recipe,
          updatedAt: Timestamp.now()
        });
        alert("Recipe updated successfully!");
        setIsEditing(false);
      } else {
        const docRef = await addDoc(collection(db, "saved_recipes"), {
          foodBankId: user.uid,
          recipe,
          createdAt: Timestamp.now()
        });
        setCurrentRecipeId(docRef.id);
        alert("Recipe saved successfully!");
      }
      fetchSavedRecipes(); // Refresh list
    } catch (error) {
      console.error("Error saving recipe:", error);
      alert("Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    
    try {
      await deleteDoc(doc(db, "saved_recipes", id));
      if (currentRecipeId === id) {
        setRecipe(null);
        setCurrentRecipeId(null);
        setView('saved');
      }
      fetchSavedRecipes();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert("Failed to delete recipe.");
    }
  };

  const generatePlan = async () => {
    if (!user) return;
    setLoading(true);
    setRecipe(null); // Clear previous recipe to show loading state clearly
    setCurrentRecipeId(null);
    setIsEditing(false);
    
    try {
      // Fetch current inventory
      const q = query(
        collection(db, "inventory"), 
        where("foodBankId", "==", user.uid),
        orderBy("expiryDate", "asc") // Prioritize expiring items
      );
      const snapshot = await getDocs(q);
      const inventoryItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          productName: data.productName,
          quantity: data.quantity,
          unitSize: data.unitSize,
          expiryDate: data.expiryDate?.toDate().toLocaleDateString() || 'N/A'
        };
      });

      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate plan');
      }
      
      const data = await response.json();
      setRecipe(data);
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "Failed to generate meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-max mx-auto mb-8">
        <button 
          onClick={() => setView('generate')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'generate' ? 'bg-white text-nb-ink shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Generate
        </button>
        <button 
          onClick={() => setView('saved')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'saved' ? 'bg-white text-nb-ink shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Saved Recipes
        </button>
      </div>

      {view === 'saved' ? (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          {savedRecipes.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-400">
              <i className="fas fa-bookmark text-4xl mb-3 opacity-50"></i>
              <p>No saved recipes yet.</p>
            </div>
          ) : (
            savedRecipes.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative" onClick={() => { setRecipe(item.recipe); setCurrentRecipeId(item.id); setView('generate'); setIsEditing(false); }}>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => handleDelete(e, item.id)}
                        className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm flex items-center justify-center transition-colors"
                        title="Delete Recipe"
                    >
                        <i className="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2 pr-8">
                    <h3 className="font-bold text-nb-ink text-lg group-hover:text-nb-blue transition-colors">{item.recipe.name}</h3>
                    <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-full uppercase shrink-0 ml-2">{item.recipe.difficulty}</span>
                  </div>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4">{item.recipe.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center"><i className="fas fa-clock mr-1.5"></i> {item.recipe.prepTime}</span>
                    <span className="flex items-center"><i className="fas fa-user-friends mr-1.5"></i> {item.recipe.servings}</span>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                   <span className="text-xs text-slate-400">Saved on {item.createdAt?.toDate().toLocaleDateString()}</span>
                   <span className="text-xs font-bold text-nb-blue">View Recipe <i className="fas fa-arrow-right ml-1"></i></span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
      {!recipe && !loading && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 border border-slate-100">
            <i className="fas fa-utensils text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-nb-ink mb-2">Chef's Recommendation</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Generate a creative recipe based on your current inventory to reduce waste.
          </p>
          
          <button 
            onClick={generatePlan}
            disabled={inventoryCount === 0}
            className="bg-nb-ink text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center mx-auto text-sm tracking-wide uppercase"
          >
            <i className="fas fa-sparkles mr-3 text-yellow-400"></i> Generate Recipe
          </button>
          {inventoryCount === 0 && (
            <p className="text-xs text-red-400 mt-4 font-medium bg-red-50 inline-block px-3 py-1 rounded-full">
              <i className="fas fa-exclamation-circle mr-1"></i> Add items to inventory first
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nb-blue mb-4"></div>
          <p className="text-slate-400 font-medium animate-pulse">Creating something delicious...</p>
        </div>
      )}

      {recipe && !loading && (
        <div className="animate-fade-in">
          {/* Header Actions */}
          <div className="flex justify-end mb-4 gap-3">
             {currentRecipeId && (
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`text-xs font-bold px-4 py-2 rounded-full transition-all shadow-sm flex items-center ${isEditing ? 'bg-slate-200 text-slate-600' : 'bg-white text-slate-400 hover:text-nb-blue border border-slate-100'}`}
                >
                    <i className={`fas ${isEditing ? 'fa-times' : 'fa-pen'} mr-2`}></i> {isEditing ? 'Cancel Edit' : 'Edit'}
                </button>
             )}
             <button 
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-bold text-white bg-nb-blue hover:bg-indigo-600 px-4 py-2 rounded-full transition-all shadow-sm flex items-center disabled:opacity-50"
             >
                {saving ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                ) : (
                  <i className="fas fa-save mr-2"></i>
                )}
                {currentRecipeId ? 'Update Recipe' : 'Save Recipe'}
             </button>
             {!currentRecipeId && (
                <button 
                    onClick={generatePlan}
                    className="text-xs font-bold text-slate-400 hover:text-nb-blue bg-white hover:bg-blue-50 px-4 py-2 rounded-full transition-all border border-slate-100 shadow-sm flex items-center"
                >
                    <i className="fas fa-sync-alt mr-2"></i> Regenerate
                </button>
             )}
          </div>

          {/* Recipe Card */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            {/* Hero Section */}
            <div className="bg-slate-50 p-8 border-b border-slate-100">
              <div className="flex flex-wrap gap-2 mb-4">
                {recipe.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] font-bold uppercase tracking-wider bg-white text-nb-blue px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
              
              {isEditing ? (
                <div className="space-y-4 mb-6">
                    <input 
                        type="text" 
                        value={recipe.name}
                        onChange={(e) => setRecipe({...recipe, name: e.target.value})}
                        className="w-full text-3xl md:text-4xl font-display font-bold text-nb-ink bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-nb-blue outline-none"
                        placeholder="Recipe Name"
                    />
                    <textarea 
                        value={recipe.description}
                        onChange={(e) => setRecipe({...recipe, description: e.target.value})}
                        className="w-full text-lg text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2 focus:border-nb-blue outline-none resize-none"
                        rows={2}
                        placeholder="Description"
                    />
                </div>
              ) : (
                <>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-nb-ink mb-3">{recipe.name}</h1>
                    <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{recipe.description}</p>
                </>
              )}
              
              {/* Meta Data */}
              <div className="flex flex-wrap gap-6 mt-8">
                <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mr-3">
                    <i className="fas fa-clock text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Time</p>
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={recipe.prepTime}
                            onChange={(e) => setRecipe({...recipe, prepTime: e.target.value})}
                            className="font-bold text-sm bg-white border border-slate-200 rounded px-2 py-0.5 w-24"
                        />
                    ) : (
                        <p className="font-bold text-sm">{recipe.prepTime}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center mr-3">
                    <i className="fas fa-chart-bar text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Difficulty</p>
                    {isEditing ? (
                        <select 
                            value={recipe.difficulty}
                            onChange={(e) => setRecipe({...recipe, difficulty: e.target.value})}
                            className="font-bold text-sm bg-white border border-slate-200 rounded px-2 py-0.5 w-24"
                        >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                        </select>
                    ) : (
                        <p className="font-bold text-sm">{recipe.difficulty}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-3">
                    <i className="fas fa-fire text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Calories</p>
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={recipe.calories}
                            onChange={(e) => setRecipe({...recipe, calories: e.target.value})}
                            className="font-bold text-sm bg-white border border-slate-200 rounded px-2 py-0.5 w-24"
                        />
                    ) : (
                        <p className="font-bold text-sm">{recipe.calories}</p>
                    )}
                  </div>
                </div>
                 <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3">
                    <i className="fas fa-user-friends text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Servings</p>
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={recipe.servings}
                            onChange={(e) => setRecipe({...recipe, servings: e.target.value})}
                            className="font-bold text-sm bg-white border border-slate-200 rounded px-2 py-0.5 w-24"
                        />
                    ) : (
                        <p className="font-bold text-sm">{recipe.servings}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Ingredients Column */}
              <div className="p-8 md:col-span-1 bg-white">
                <h3 className="font-bold text-nb-ink mb-6 flex items-center">
                  <i className="fas fa-shopping-basket text-nb-blue mr-3"></i> Ingredients
                </h3>
                {isEditing ? (
                    <textarea 
                        value={Array.isArray(recipe.ingredients) 
                          ? typeof recipe.ingredients[0] === 'string'
                            ? (recipe.ingredients as string[]).join('\n')
                            : (recipe.ingredients as StructuredIngredient[]).map(ing => 
                                `${ing.estimatedQuantity} ${ing.unit} ${ing.productName}`
                              ).join('\n')
                          : ''
                        }
                        onChange={(e) => {
                          // For editing, keep as strings for simplicity
                          setRecipe({...recipe, ingredients: e.target.value.split('\n') as any});
                        }}
                        className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-nb-blue outline-none min-h-[300px]"
                        placeholder="One ingredient per line"
                    />
                ) : (
                    <ul className="space-y-3">
                    {recipe.ingredients.map((item, i) => {
                      // Handle both string and structured ingredients
                      const displayText = typeof item === 'string' 
                        ? item 
                        : `${item.estimatedQuantity} ${item.unit} ${item.productName}${item.totalAmount ? ` (${item.totalAmount})` : ''}`;
                      
                      return (
                        <li key={i} className="flex items-start text-sm text-slate-600 group">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 mr-3 group-hover:bg-nb-blue transition-colors"></span>
                          <span className="group-hover:text-nb-ink transition-colors">{displayText}</span>
                        </li>
                      );
                    })}
                    </ul>
                )}
              </div>

              {/* Instructions Column */}
              <div className="p-8 md:col-span-2 bg-white">
                <h3 className="font-bold text-nb-ink mb-6 flex items-center">
                  <i className="fas fa-list-ol text-nb-blue mr-3"></i> Instructions
                </h3>
                {isEditing ? (
                    <textarea 
                        value={recipe.steps.join('\n')}
                        onChange={(e) => setRecipe({...recipe, steps: e.target.value.split('\n')})}
                        className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-nb-blue outline-none min-h-[300px]"
                        placeholder="One step per line"
                    />
                ) : (
                    <div className="space-y-6">
                    {recipe.steps.map((step, i) => (
                        <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 text-nb-blue font-bold flex items-center justify-center text-sm shadow-sm">
                            {i + 1}
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed pt-1.5">{step}</p>
                        </div>
                    ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
