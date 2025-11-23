import { Timestamp } from "firebase/firestore";

export type UserRole = 'donor' | 'volunteer' | 'foodbank';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  onboardingCompleted?: boolean;
  
  // Donor specific
  organizationName?: string;
  businessType?: 'grocery' | 'restaurant' | 'farm' | 'bakery' | 'cafe' | 'other';
  pickupAddress?: string;
  accessInstructions?: string;

  // Volunteer specific
  vehicleType?: 'sedan' | 'suv' | 'van' | 'truck' | 'bicycle' | 'foot';
  baseLocation?: string; // City/Area
  availability?: string[]; // e.g. ['weekdays_morning', 'weekends']

  // Food Bank specific
  dropoffAddress?: string;
  receivingHours?: string;
  storageCapabilities?: ('fridge' | 'freezer' | 'dry_storage')[];
  
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface Donation {
  id?: string;
  donorId: string;
  title: string;
  description: string;
  weight: number; // in kg or count
  weightUnit: 'kg' | 'lbs' | 'items';
  expiryDate: Timestamp;
  pickupWindow: string; // e.g., "Today 2-4pm"
  status: 'available' | 'claimed' | 'picked_up' | 'delivered';
  createdAt: Timestamp;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  // Flagged donation properties
  mustShipTo?: string; // Food bank ID this donation MUST be shipped to
  fromRequestId?: string; // Links back to the UrgentRequest that created this
}

export interface UrgentRequest {
  id?: string;
  foodBankId: string;
  foodBankName?: string;
  item: string;
  quantity?: string;
  details?: string;
  urgency: 'high' | 'medium' | 'low';
  status: 'open' | 'accepted' | 'fulfilled';
  createdAt: Timestamp;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: Timestamp;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface InventoryItem {
  id?: string;
  foodBankId: string;
  productName: string;
  brand: string;
  quantity: number;
  barcode: string;
  nutriScore: string;
  allergens: string[];
  expiryDate: Timestamp;
  createdAt: Timestamp;
  imageUrl?: string | null;
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
