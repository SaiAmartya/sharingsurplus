"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';

interface ProductModalProps {
  product: any;
  barcode: string;
  onClose: () => void;
}

export default function ProductModal({ product, barcode, onClose }: ProductModalProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const parseExpiryDate = () => {
    if (product.expiration_date) {
      // Try to parse DD/MM/YYYY which is common in OFF
      const parts = product.expiration_date.split('/');
      if (parts.length === 3) {
        return Timestamp.fromDate(new Date(`${parts[2]}-${parts[1]}-${parts[0]}`));
      }
      // Try standard date parse
      const date = new Date(product.expiration_date);
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    }
    // Default to 6 months from now if no expiry date in OpenFoodFacts
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    return Timestamp.fromDate(futureDate);
  };

  const handleAdd = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, "inventory"), {
        foodBankId: user.uid,
        productName: product.product_name || "Unknown Product",
        brand: product.brands || "Unknown Brand",
        quantity: Number(quantity),
        barcode: barcode,
        nutriScore: product.nutriscore_grade || 'unknown',
        allergens: product.allergens_tags || [],
        expiryDate: parseExpiryDate(),
        createdAt: serverTimestamp(),
        imageUrl: product.image_url || null
      });
      onClose();
    } catch (error) {
      console.error("Error adding to inventory:", error);
      alert("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-display font-bold text-xl text-nb-ink">Add to Inventory</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-nb-ink transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            <div className="flex gap-4 mb-6">
                {product.image_url && (
                    <img src={product.image_url} alt={product.product_name} className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
                )}
                <div>
                    <h4 className="font-bold text-lg text-nb-ink">{product.product_name}</h4>
                    <p className="text-slate-500 text-sm">{product.brands}</p>
                    {product.nutriscore_grade && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            product.nutriscore_grade === 'a' ? 'bg-green-100 text-green-700' :
                            product.nutriscore_grade === 'b' ? 'bg-lime-100 text-lime-700' :
                            product.nutriscore_grade === 'c' ? 'bg-yellow-100 text-yellow-700' :
                            product.nutriscore_grade === 'd' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            Nutri-Score {product.nutriscore_grade}
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-nb-ink mb-1">Quantity</label>
                    <input 
                        type="number" 
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nb-blue/20 focus:border-nb-blue transition-all"
                    />
                </div>
                {product.expiration_date && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-sm text-blue-700">
                            <i className="far fa-calendar mr-2"></i>
                            <strong>Expiry:</strong> {product.expiration_date}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2 rounded-full font-bold text-slate-500 hover:bg-slate-200 transition-all"
            >
                Cancel
            </button>
            <button 
                onClick={handleAdd}
                disabled={loading}
                className="px-6 py-2 rounded-full font-bold text-white bg-nb-ink hover:bg-nb-blue shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Adding...' : 'Add Item'}
            </button>
        </div>
      </div>
    </div>
  );
}
