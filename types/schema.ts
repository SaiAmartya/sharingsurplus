import { Timestamp } from "firebase/firestore";

export type UserRole = 'donor' | 'volunteer' | 'foodbank';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  phoneNumber?: string;
}

export interface Donation {
  id?: string;
  donorId: string;
  title: string;
  description: string;
  weight: number; // in kg
  weightUnit: 'kg' | 'lbs';
  expiryDate: Timestamp;
  pickupWindow: string; // e.g., "Today 2-4pm"
  photoUrl?: string;
  status: 'available' | 'claimed' | 'picked_up' | 'delivered';
  createdAt: Timestamp;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface UrgentRequest {
  id?: string;
  foodBankId: string;
  item: string;
  urgency: 'high' | 'medium' | 'low';
  status: 'open' | 'fulfilled';
  createdAt: Timestamp;
}

export interface Route {
  id?: string;
  volunteerId: string;
  stops: Array<{
    type: 'pickup' | 'dropoff';
    location: {
      lat: number;
      lng: number;
      address: string;
    };
    donationId?: string;
    requestId?: string;
    completed: boolean;
  }>;
  status: 'pending' | 'in_progress' | 'completed';
  estimatedTime: number; // minutes
  totalWeight: number;
}

export interface InventoryItem {
  id?: string;
  foodBankId: string;
  productName: string;
  brand: string;
  quantity: number;
  expiryDate: Timestamp;
  barcode?: string;
  nutriScore?: string;
  allergens?: string[];
  locationInWarehouse?: string;
}
