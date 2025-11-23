"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';

interface Recipe {
  name: string;
  description: string;
  prepTime: string;
  difficulty: string;
  calories: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

export default function MealPlansPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkInventory();
    }
  }, [user]);

  const checkInventory = async () => {
    if (!user) return;
    const q = query(collection(db, "inventory"), where("foodBankId", "==", user.uid));
    const snapshot = await getDocs(q);
    setInventoryCount(snapshot.size);
  };

  const generatePlan = async () => {
    if (!user) return;
    setLoading(true);
    setRecipe(null); // Clear previous recipe to show loading state clearly
    
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
          <div className="flex justify-end mb-4">
             <button 
                onClick={generatePlan}
                className="text-xs font-bold text-slate-400 hover:text-nb-blue bg-white hover:bg-blue-50 px-4 py-2 rounded-full transition-all border border-slate-100 shadow-sm flex items-center"
             >
                <i className="fas fa-sync-alt mr-2"></i> Regenerate
             </button>
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
              <h1 className="text-3xl md:text-4xl font-display font-bold text-nb-ink mb-3">{recipe.name}</h1>
              <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{recipe.description}</p>
              
              {/* Meta Data */}
              <div className="flex flex-wrap gap-6 mt-8">
                <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mr-3">
                    <i className="fas fa-clock text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Time</p>
                    <p className="font-bold text-sm">{recipe.prepTime}</p>
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center mr-3">
                    <i className="fas fa-chart-bar text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Difficulty</p>
                    <p className="font-bold text-sm">{recipe.difficulty}</p>
                  </div>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-3">
                    <i className="fas fa-fire text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Calories</p>
                    <p className="font-bold text-sm">{recipe.calories}</p>
                  </div>
                </div>
                 <div className="flex items-center text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3">
                    <i className="fas fa-user-friends text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Servings</p>
                    <p className="font-bold text-sm">{recipe.servings}</p>
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
                <ul className="space-y-3">
                  {recipe.ingredients.map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-600 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 mr-3 group-hover:bg-nb-blue transition-colors"></span>
                      <span className="group-hover:text-nb-ink transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions Column */}
              <div className="p-8 md:col-span-2 bg-white">
                <h3 className="font-bold text-nb-ink mb-6 flex items-center">
                  <i className="fas fa-list-ol text-nb-blue mr-3"></i> Instructions
                </h3>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
