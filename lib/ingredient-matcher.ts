import { InventoryItem, StructuredIngredient } from "@/types/schema";

/**
 * Calculate similarity score between two strings (0-1, where 1 is exact match)
 * Uses Levenshtein distance-like algorithm with normalization
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple word overlap scoring
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matchCount = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchCount++;
        break;
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length);
  return matchCount / maxWords;
}

/**
 * Match a recipe ingredient to inventory items
 * Returns the best matching inventory item or null if confidence is too low
 */
export function matchIngredientToInventory(
  ingredient: StructuredIngredient,
  inventoryItems: InventoryItem[],
  confidenceThreshold: number = 0.5
): InventoryItem | null {
  let bestMatch: InventoryItem | null = null;
  let bestScore = 0;
  
  for (const item of inventoryItems) {
    // Calculate similarity between ingredient name and product name
    const nameScore = calculateSimilarity(ingredient.productName, item.productName);
    
    // Bonus points for brand match if ingredient mentions brand
    const brandScore = item.brand 
      ? calculateSimilarity(ingredient.productName, item.brand) * 0.3
      : 0;
    
    const totalScore = nameScore + brandScore;
    
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = item;
    }
  }
  
  // Only return match if confidence is above threshold
  if (bestScore >= confidenceThreshold && bestMatch) {
    return bestMatch;
  }
  
  return null;
}

/**
 * Match all recipe ingredients to inventory items
 * Returns array of ingredients with matched inventory item IDs
 */
export function matchAllIngredients(
  ingredients: StructuredIngredient[],
  inventoryItems: InventoryItem[],
  confidenceThreshold: number = 0.5
): StructuredIngredient[] {
  return ingredients.map(ingredient => {
    const matchedItem = matchIngredientToInventory(ingredient, inventoryItems, confidenceThreshold);
    
    if (matchedItem) {
      return {
        ...ingredient,
        inventoryItemId: matchedItem.id,
        barcode: matchedItem.barcode,
      };
    }
    
    return ingredient;
  });
}

/**
 * Calculate available quantity for an inventory item
 * Subtracts reserved quantity from total quantity
 */
export function getAvailableQuantity(item: InventoryItem): number {
  const reserved = item.reservedQuantity || 0;
  return Math.max(0, item.quantity - reserved);
}

/**
 * Validate that inventory has enough quantity for ingredient usage
 * Returns true if sufficient inventory exists
 */
export function validateInventoryAvailability(
  ingredient: StructuredIngredient,
  inventoryItem: InventoryItem
): { isValid: boolean; available: number; needed: number } {
  const available = getAvailableQuantity(inventoryItem);
  const needed = ingredient.estimatedQuantity;
  
  return {
    isValid: available >= needed,
    available,
    needed,
  };
}
