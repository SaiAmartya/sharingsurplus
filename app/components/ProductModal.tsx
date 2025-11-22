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
  const [nutriScore, setNutriScore] = useState(product.nutriscore_grade?.toUpperCase() || '?');
  
  // Default expiry to 1 week from now
  const [expiryDate, setExpiryDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

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
        nutriScore: nutriScore,
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
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-100">
          <h2 className="font-display text-xl font-bold text-nb-ink">Product Analysis</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-nb-red hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="flex gap-6">
            {product.image_url && (
              <img src={product.image_url} alt={product.product_name} className="w-32 h-32 object-contain bg-white rounded-xl border border-slate-100" />
            )}
            <div>
              <input 
                type="text" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="font-display text-2xl font-bold text-nb-ink bg-transparent border-b border-transparent hover:border-slate-200 focus:border-nb-blue outline-none w-full placeholder:text-slate-300"
                placeholder="Product Name"
              />
              <input 
                type="text" 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-200 focus:border-nb-blue outline-none w-full mt-1 placeholder:text-slate-300"
                placeholder="Brand"
              />
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                Barcode: {barcode}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-nb-bg rounded-2xl">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nutri-Score</label>
              <select 
                value={nutriScore}
                onChange={(e) => setNutriScore(e.target.value)}
                className="text-2xl font-display font-bold text-nb-ink bg-transparent outline-none w-full cursor-pointer"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="?">?</option>
              </select>
            </div>
            <div className="p-4 bg-nb-bg rounded-2xl">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Quantity</label>
              <input 
                type="number" 
                value={quantity} 
                min="1"
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-transparent font-display font-bold text-2xl outline-none" 
              />
            </div>
            <div className="p-4 bg-nb-bg rounded-2xl col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Expiry Date</label>
              <input 
                type="date" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-transparent font-display font-bold text-xl outline-none text-nb-ink" 
              />
            </div>
          </div>

          {product.allergens_tags && product.allergens_tags.length > 0 && (
             <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <label className="text-xs font-bold text-red-400 uppercase block mb-2">Allergens</label>
                <div className="flex flex-wrap gap-2">
                  {product.allergens_tags.map((allergen, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-red-600 text-xs font-bold rounded-md border border-red-100">
                      {allergen.replace('en:', '')}
                    </span>
                  ))}
                </div>
             </div>
          )}

          <button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full bg-nb-ink text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Add to Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}
