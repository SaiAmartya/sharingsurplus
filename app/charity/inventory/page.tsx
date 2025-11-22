"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp, where, updateDoc } from 'firebase/firestore';
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

const InventoryItemRow = ({ item }: { item: InventoryItem }) => {
  const [dateValue, setDateValue] = useState(
    item.expiryDate ? item.expiryDate.toDate().toISOString().split('T')[0] : ''
  );

  useEffect(() => {
    setDateValue(item.expiryDate ? item.expiryDate.toDate().toISOString().split('T')[0] : '');
  }, [item.expiryDate]);

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    setDateValue(newDateStr);

    if (!newDateStr) return;
    
    try {
      // Use UTC Noon to ensure stability across timezones
      const newDate = new Date(newDateStr);
      newDate.setUTCHours(12, 0, 0, 0);
      
      await updateDoc(doc(db, "inventory", item.id), {
        expiryDate: Timestamp.fromDate(newDate)
      });
    } catch (error) {
      console.error("Error updating expiry date:", error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this item from inventory?')) {
      try {
        await deleteDoc(doc(db, "inventory", item.id));
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

  return (
    <div className="bg-white rounded-2xl p-4 grid grid-cols-6 items-center shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all border border-transparent hover:border-nb-blue/20 group">
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
        <input 
          type="date"
          className="bg-transparent border border-transparent hover:border-slate-200 rounded px-2 py-1 text-sm text-slate-600 font-medium focus:ring-2 focus:ring-nb-blue focus:border-transparent transition-all cursor-pointer w-full max-w-[140px]"
          value={dateValue}
          onChange={handleDateChange}
          onClick={(e) => e.stopPropagation()}
        />
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
            onClick={handleDelete}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Remove Item"
          >
              <i className="fas fa-trash-alt"></i>
          </button>
      </div>
    </div>
  );
};

export default function CharityInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates
    const q = query(
      collection(db, "inventory"), 
      where("foodBankId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nb-blue"></div>
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
          <InventoryItemRow key={item.id} item={item} />
        ))}
    </div>
  );
}

