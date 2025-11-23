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
  unitSize?: string; // Size of ONE container (e.g., "24oz", "500g")
  category?: string;
  reservedQuantity?: number; // Amount reserved for active distributions
  distributedQuantity?: number; // Total amount ever distributed
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

// Recipe and Meal Plan Interfaces
export interface Recipe {
  name: string;
  description: string;
  prepTime: string;
  difficulty: string;
  calories: string;
  servings: string; // e.g., "200 people"
  ingredients: StructuredIngredient[]; // Changed from string[] to structured format
  steps: string[];
  tags: string[];
}

export interface StructuredIngredient {
  productName: string; // Name of the ingredient
  estimatedQuantity: number; // Estimated quantity needed
  unit: string; // Unit of measurement (e.g., "jars", "lbs", "oz")
  totalAmount?: string; // Human-readable total (e.g., "12,000oz")
  inventoryItemId?: string; // Matched inventory item ID (set during distribution setup)
  barcode?: string; // Barcode if matched
}

export interface SavedRecipe {
  id?: string;
  foodBankId: string;
  recipe: Recipe;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Distribution Tracking Interfaces
export interface DistributionSession {
  id?: string;
  foodBankId: string;
  recipeId: string; // Reference to saved_recipes/{recipeId}
  recipeName: string;
  plannedServings: string; // From recipe.servings
  status: 'active' | 'completed' | 'cancelled';
  
  // Meal counting
  initialMealCount?: number; // How many meal plans started with
  finalMealCount?: number; // How many meal plans remain after distribution
  distributedMealCount?: number; // Calculated: initial - final
  
  // Ingredient tracking
  ingredientUsage: IngredientUsage[]; // What ingredients are being used
  
  // Metadata
  startedBy: string; // User ID who started distribution
  startedByName?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  completedByName?: string;
  
  // Validation flags
  hasVariance?: boolean; // True if actual usage differs from expected
  varianceNotes?: string;
}

export interface IngredientUsage {
  productName: string;
  inventoryItemId?: string; // Matched inventory item
  barcode?: string;
  
  // Expected usage (from recipe)
  expectedQuantity: number;
  expectedUnit: string;
  
  // Actual usage (calculated based on meal count)
  actualQuantity?: number;
  
  // Inventory deduction
  deductedFromInventory: boolean;
  deductedAt?: Timestamp;
  
  // Variance tracking
  variance?: number; // Difference between expected and actual
  variancePercentage?: number;
}

export interface DistributionLog {
  id?: string;
  foodBankId: string;
  distributionSessionId: string;
  action: 'session_started' | 'counting_completed' | 'inventory_deducted' | 'session_cancelled';
  
  // Item-specific details
  inventoryItemId?: string;
  productName?: string;
  quantityBefore?: number;
  quantityAfter?: number;
  quantityChanged?: number;
  
  // Metadata
  performedBy: string;
  performedByName?: string;
  performedAt: Timestamp;
  notes?: string;
}

