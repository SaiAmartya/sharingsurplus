"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp, where } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';

interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  quantity: number;
  nutriScore: string;
  expiryDate: Timestamp;
  imageUrl?: string;
  barcode: string;
}

export default function CharityInventory() {
  const { user, loading: authLoading } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize
    
    if (!user) {
      setLoading(false);
      setInventory([]);
      return;
    }

    // Subscribe to real-time updates
    const q = query(
      collection(db, "inventory"), 
      where("foodBankId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InventoryItem[];
        setInventory(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching inventory:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row click if we add one later
    if (window.confirm('Remove this item from inventory?')) {
      try {
        await deleteDoc(doc(db, "inventory", id));
      } catch (error) {
        console.error("Error removing item:", error);
        alert("Failed to remove item.");
      }
    }
  };

  const getScoreColor = (score: string) => {
    const s = score?.toUpperCase();
    if (['A', 'B'].includes(s)) return 'bg-nb-teal-soft text-nb-teal';
    if (['C'].includes(s)) return 'bg-nb-orange-soft text-nb-orange';
    return 'bg-nb-red-soft text-nb-red';
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nb-ink"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-red-50 rounded-3xl border-2 border-red-200">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-2xl text-red-500"></i>
        </div>
        <h3 className="text-xl font-bold text-red-700 mb-2">Error Loading Inventory</h3>
        <p className="text-red-600 max-w-md mx-auto mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <i className="fas fa-box-open text-4xl mb-3 opacity-50"></i>
        <p>No items in inventory yet.</p>
        <p className="text-sm">Scan items to add them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-6 px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">Product</div>
            <div>Qty</div>
            <div>Expiry</div>
            <div>Score</div>
            <div className="text-right">Action</div>
        </div>

        {inventory.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-4 grid grid-cols-6 items-center shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all border border-transparent hover:border-nb-blue/20 group">
              {/* Product Info */}
              <div className="col-span-2 flex items-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mr-4 overflow-hidden shrink-0 border border-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <i className="fas fa-box text-slate-300"></i>
                      )}
                  </div>
                  <div className="min-w-0">
                      <p className="font-bold text-nb-ink truncate pr-2">{item.productName}</p>
                      <p className="text-xs text-slate-400 font-medium truncate">{item.brand}</p>
                  </div>
              </div>

              {/* Quantity */}
              <div>
                <div className="font-medium text-slate-600 bg-slate-50 inline-block px-3 py-1 rounded-lg w-max">
                  {item.quantity} units
                </div>
              </div>

              {/* Expiry */}
              <div className="font-medium text-slate-600">
                {formatDate(item.expiryDate)}
              </div>

              {/* Score */}
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(item.nutriScore)}`}>
                  {item.nutriScore || '?'}
                </span>
              </div>

              {/* Action */}
              <div className="text-right">
                  <button 
                    onClick={(e) => handleDelete(e, item.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Remove Item"
                  >
                      <i className="fas fa-trash-alt"></i>
                  </button>
              </div>
          </div>
        ))}
    </div>
  );
}

