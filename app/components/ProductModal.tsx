"use client";

import { useState } from 'react';
import { ProductData } from '@/lib/openfoodfacts';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';

interface ProductModalProps {
  product: ProductData;
  barcode: string;
  onClose: () => void;
}

export default function ProductModal({ product, barcode, onClose }: ProductModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Editable State
  const [productName, setProductName] = useState(product.product_name || '');
  const [brand, setBrand] = useState(product.brands || '');
  const [quantity, setQuantity] = useState(() => {
    // Try to parse a number from the quantity string if it exists
    if (product.quantity) {
      const parsed = parseInt(product.quantity);
      return isNaN(parsed) ? 1 : parsed;
    }
    return 1;
  });
  const [category, setCategory] = useState(product.categories || '');
  
  // Default expiry to 1 week from now
  const [expiryDate, setExpiryDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  const addDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setExpiryDate(date.toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    if (!user) {
      alert("You must be logged in to add items.");
      return;
    }

    setLoading(true);
    try {
      const userId = user.uid; 
      
      await addDoc(collection(db, 'inventory'), {
        foodBankId: userId,
        productName: productName || 'Unknown Product',
        brand: brand || 'Unknown Brand',
        quantity: quantity,
        barcode: barcode,
        category: category,
        // nutriScore removed from UI, saving original if available or null
        nutriScore: product.nutriscore_grade || null, 
        allergens: product.allergens_tags || [],
        expiryDate: Timestamp.fromDate(new Date(expiryDate)),
        createdAt: Timestamp.now(),
        imageUrl: product.image_url || null
      });
      onClose();
    } catch (error) {
      console.error("Error saving to inventory:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-white p-6 flex justify-between items-center border-b border-slate-100 sticky top-0 z-20">
          <h2 className="font-display text-xl font-bold text-nb-ink">Add to Inventory</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Product Header */}
          <div className="flex gap-5">
            <div className="w-24 h-24 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                {product.image_url ? (
                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain" />
                ) : (
                <i className="fas fa-box text-slate-300 text-3xl"></i>
                )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Name</label>
                <input 
                    type="text" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="font-display text-lg font-bold text-nb-ink bg-transparent border-b border-slate-200 focus:border-nb-blue outline-none w-full placeholder:text-slate-300 pb-1 transition-colors"
                    placeholder="e.g. Apple AirPods"
                />
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand</label>
                <input 
                    type="text" 
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="text-sm font-medium text-slate-600 bg-transparent border-b border-slate-200 focus:border-nb-blue outline-none w-full placeholder:text-slate-300 pb-1 transition-colors"
                    placeholder="e.g. Apple"
                />
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 focus-within:border-nb-blue/50 focus-within:bg-blue-50/50 transition-colors">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Quantity</label>
              <div className="flex items-center">
                <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-white shadow-sm text-slate-600 hover:bg-nb-blue hover:text-white transition-colors flex items-center justify-center"
                >
                    <i className="fas fa-minus text-xs"></i>
                </button>
                <input 
                    type="number" 
                    value={quantity} 
                    min="1"
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-transparent font-display font-bold text-2xl outline-none text-center text-nb-ink" 
                />
                <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full bg-white shadow-sm text-slate-600 hover:bg-nb-blue hover:text-white transition-colors flex items-center justify-center"
                >
                    <i className="fas fa-plus text-xs"></i>
                </button>
              </div>
            </div>

            {/* Category */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 focus-within:border-nb-blue/50 focus-within:bg-blue-50/50 transition-colors">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Category</label>
              <input 
                type="text" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent font-display font-bold text-lg outline-none text-nb-ink placeholder:text-slate-300"
                placeholder="e.g. Electronics" 
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Expiry Date</label>
            <input 
                type="date" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-display font-bold text-lg outline-none text-nb-ink focus:border-nb-blue transition-colors mb-4" 
            />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button onClick={() => addDays(3)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-nb-blue hover:text-nb-blue transition-colors whitespace-nowrap">+3 Days</button>
                <button onClick={() => addDays(7)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-nb-blue hover:text-nb-blue transition-colors whitespace-nowrap">+1 Week</button>
                <button onClick={() => addDays(30)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-nb-blue hover:text-nb-blue transition-colors whitespace-nowrap">+1 Month</button>
                <button onClick={() => addDays(90)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-nb-blue hover:text-nb-blue transition-colors whitespace-nowrap">+3 Months</button>
            </div>
          </div>

          {product.allergens_tags && product.allergens_tags.length > 0 && (
             <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <label className="text-[10px] font-bold text-red-400 uppercase block mb-2">Allergens Detected</label>
                <div className="flex flex-wrap gap-2">
                  {product.allergens_tags.map((allergen, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-red-600 text-xs font-bold rounded-md border border-red-100 shadow-sm">
                      {allergen.replace('en:', '')}
                    </span>
                  ))}
                </div>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-20">
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="w-full bg-nb-ink text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Saving...</span>
                    </>
                ) : (
                    <>
                        <i className="fas fa-check"></i>
                        <span>Confirm & Add Item</span>
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
