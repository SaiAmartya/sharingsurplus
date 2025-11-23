"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp, where, addDoc, updateDoc } from 'firebase/firestore';
import ProductModal from '@/app/components/ProductModal';
import { ProductData } from '@/lib/openfoodfacts';
import { useAuth } from '@/app/context/AuthContext';
import { getUserProfile } from "@/lib/auth-helpers";
import { UrgentRequest } from '@/types/schema';

interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  quantity: number;
  nutriScore: string;
  expiryDate: Timestamp;
  imageUrl?: string;
  barcode: string;
  category?: string;
  unitSize?: string;
}

export default function CharityInventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests'>('inventory');

  // Request Food State
  const [myRequests, setMyRequests] = useState<UrgentRequest[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<UrgentRequest | null>(null);
  const [requestData, setRequestData] = useState({ item: "", quantity: "", details: "", urgency: "medium" });
  const [requestLoading, setRequestLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [requestStatus, setRequestStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        if (profile?.location) {
          setUserLocation(profile.location);
        }
      }
    };
    fetchLocation();
  }, []);

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

    // Subscribe to my requests
    // Note: Sorting client-side to avoid needing a composite index immediately
    const qRequests = query(
      collection(db, "requests"),
      where("foodBankId", "==", user.uid)
    );
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UrgentRequest[];
      
      // Filter to show only OPEN requests (remove once accepted)
      // Sort by newest first
      const activeRequests = requests
        .filter(r => r.status === 'open')
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        
      setMyRequests(activeRequests);
    });

    return () => {
      unsubscribe();
      unsubscribeRequests();
    };
  }, [user]);

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

  const handleEdit = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setEditingItem(item);
  };

  const handleEditRequest = (request: UrgentRequest) => {
    setEditingRequest(request);
    setRequestData({
      item: request.item,
      quantity: request.quantity || "",
      details: request.details || "",
      urgency: request.urgency
    });
    setIsRequestModalOpen(true);
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('Delete this request?')) {
      try {
        await deleteDoc(doc(db, "requests", id));
        setRequestStatus({ type: 'success', message: "Request deleted." });
      } catch (error) {
        console.error("Error deleting request:", error);
        setRequestStatus({ type: 'error', message: "Failed to delete request." });
      }
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setRequestLoading(true);
    setRequestStatus(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      if (editingRequest) {
        // Update existing request
        await updateDoc(doc(db, "requests", editingRequest.id!), {
          item: requestData.item,
          quantity: requestData.quantity,
          details: requestData.details,
          urgency: requestData.urgency,
          // Don't update status or createdAt
        });
        setRequestStatus({ type: 'success', message: `Request updated successfully.` });
      } else {
        // Create a global request
        await addDoc(collection(db, "requests"), {
          foodBankId: currentUser.uid,
          foodBankName: currentUser.displayName || "Food Bank",
          item: requestData.item,
          quantity: requestData.quantity,
          details: requestData.details,
          urgency: requestData.urgency,
          status: 'open',
          createdAt: Timestamp.now(),
          location: userLocation || null
        });
        setRequestStatus({ type: 'success', message: `Request broadcasted successfully.` });
      }

      setIsRequestModalOpen(false);
      setEditingRequest(null);
      setRequestData({ item: "", quantity: "", details: "", urgency: "medium" });
    } catch (error: any) {
      console.error("Error sending request:", error);
      setRequestStatus({ type: 'error', message: "Failed to save request. Please try again." });
    } finally {
      setRequestLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nb-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
        {/* Header with Request Button */}
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`font-display text-xl font-bold transition-colors ${activeTab === 'inventory' ? 'text-nb-ink' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Current Stock
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`font-display text-xl font-bold transition-colors ${activeTab === 'requests' ? 'text-nb-ink' : 'text-slate-400 hover:text-slate-600'}`}
            >
              My Requests
            </button>
          </div>
          <button 
            onClick={() => {
              setEditingRequest(null);
              setRequestData({ item: "", quantity: "", details: "", urgency: "medium" });
              setIsRequestModalOpen(true);
            }}
            className="bg-nb-blue text-white px-4 py-2 rounded-xl font-bold shadow-glow hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm focus:outline-none"
          >
            <i className="fas fa-bullhorn"></i>
            Request Food
          </button>
        </div>

        {activeTab === 'inventory' ? (
          inventory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <i className="fas fa-box-open text-4xl mb-3 opacity-50"></i>
              <p>No items in inventory yet.</p>
              <p className="text-sm">Scan items to add them here.</p>
            </div>
          ) : (
            <>
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
                    <div className="text-right flex justify-end gap-2">
                        <button 
                          onClick={(e) => handleEdit(e, item)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-nb-blue-soft hover:text-nb-blue transition-colors"
                          title="Edit Item"
                        >
                            <i className="fas fa-pen"></i>
                        </button>
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
            </>
          )
        ) : (
          // Requests Tab
          myRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <i className="fas fa-bullhorn text-4xl mb-3 opacity-50"></i>
              <p>No active requests.</p>
              <p className="text-sm">Click "Request Food" to broadcast a need.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all border border-transparent hover:border-nb-blue/20">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      req.urgency === 'high' ? 'bg-nb-red-soft text-nb-red' : 
                      req.urgency === 'medium' ? 'bg-nb-orange-soft text-nb-orange' : 'bg-nb-teal-soft text-nb-teal'
                    }`}>
                      <i className="fas fa-exclamation-circle text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-nb-ink">{req.item}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="capitalize font-bold">{req.urgency} Priority</span>
                        <span>•</span>
                        <span>{formatDate(req.createdAt)}</span>
                        {req.quantity && (
                          <>
                            <span>•</span>
                            <span>Qty: {req.quantity}</span>
                          </>
                        )}
                      </div>
                      {req.status === 'accepted' && (
                        <div className="mt-1 text-xs font-bold text-nb-teal">
                          <i className="fas fa-check-circle mr-1"></i>
                          Accepted by {req.acceptedByName || 'Donor'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditRequest(req)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-nb-blue-soft hover:text-nb-blue transition-colors"
                      title="Edit Request"
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button 
                      onClick={() => handleDeleteRequest(req.id!)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Delete Request"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {editingItem && (
            <ProductModal
                product={{
                    product_name: editingItem.productName,
                    brands: editingItem.brand,
                    categories: editingItem.category,
                    nutriscore_grade: editingItem.nutriScore,
                    image_url: editingItem.imageUrl,
                    code: editingItem.barcode,
                    quantity: editingItem.unitSize
                }}
                barcode={editingItem.barcode}
                onClose={() => setEditingItem(null)}
                inventoryId={editingItem.id}
                initialExpiryDate={editingItem.expiryDate?.toDate()}
                initialQuantity={editingItem.quantity}
            />
        )}

        {/* Request Modal */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-2xl font-bold">{editingRequest ? "Edit Request" : "Request Food"}</h3>
                <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 hover:text-nb-ink focus:outline-none">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2">What do you need?</label>
                  <input
                    type="text"
                    value={requestData.item}
                    onChange={(e) => setRequestData(prev => ({ ...prev, item: e.target.value }))}
                    className="nb-input p-4 w-full"
                    placeholder="e.g. Fresh Produce, Canned Goods"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2">Quantity</label>
                  <input
                    type="text"
                    value={requestData.quantity}
                    onChange={(e) => setRequestData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="nb-input p-4 w-full"
                    placeholder="e.g. 50 lbs, 10 boxes"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2">Extra Details</label>
                  <textarea
                    value={requestData.details}
                    onChange={(e) => setRequestData(prev => ({ ...prev, details: e.target.value }))}
                    className="nb-input p-4 w-full min-h-[100px]"
                    placeholder="Any specific requirements or notes..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2">Urgency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setRequestData(prev => ({ ...prev, urgency: level }))}
                        className={`p-3 rounded-xl font-bold capitalize transition-all focus:outline-none ${
                          requestData.urgency === level 
                            ? level === 'high' ? 'bg-nb-red text-white' : level === 'medium' ? 'bg-nb-orange text-white' : 'bg-nb-teal text-white'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={requestLoading}
                  className="w-full bg-nb-ink text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 focus:outline-none"
                >
                  {requestLoading ? "Saving..." : (editingRequest ? "Update Request" : "Broadcast Request")}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Status Toast */}
        {requestStatus && (
          <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-lg text-white font-bold animate-in slide-in-from-bottom-4 ${
            requestStatus.type === 'success' ? 'bg-nb-teal' : 'bg-nb-red'
          }`}>
            {requestStatus.message}
            <button onClick={() => setRequestStatus(null)} className="ml-4 opacity-70 hover:opacity-100">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
    </div>
  );
}

