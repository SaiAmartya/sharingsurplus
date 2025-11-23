import { NextRequest } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, runTransaction, addDoc, collection } from "firebase/firestore";
import { DistributionSession, DistributionLog, InventoryItem, IngredientUsage } from "@/types/schema";
import { getUserProfile } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, distributedMealCount } = await req.json();

    if (!sessionId || !userId || distributedMealCount === undefined) {
      return Response.json(
        { error: "Missing required fields: sessionId, userId, distributedMealCount" },
        { status: 400 }
      );
    }

    // Fetch the distribution session
    const sessionRef = doc(db, "distributions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return Response.json({ error: "Distribution session not found" }, { status: 404 });
    }

    const session = { id: sessionSnap.id, ...sessionSnap.data() } as DistributionSession;

    // Verify ownership
    if (session.foodBankId !== userId) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify session is active
    if (session.status !== 'active') {
      return Response.json(
        { error: `Cannot complete distribution with status: ${session.status}` },
        { status: 400 }
      );
    }

    // Get user profile for logging
    const userProfile = await getUserProfile(userId);
    const userName = userProfile?.displayName || userProfile?.email || 'Unknown';

    // Calculate ingredient usage based on distributed meal count
    const plannedServings = parseInt(session.plannedServings.split(' ')[0] || '1');
    const usageRatio = distributedMealCount / plannedServings;

    // Perform transaction to update inventory and session
    const result = await runTransaction(db, async (transaction) => {
      const updates: { itemId: string; oldQty: number; newQty: number; productName: string }[] = [];
      const updatedIngredientUsage: IngredientUsage[] = [];

      // Process each ingredient
      for (const ingredient of session.ingredientUsage) {
        const actualQuantityNeeded = Math.ceil(ingredient.expectedQuantity * usageRatio);
        
        // Update ingredient usage record
        const updatedIngredient: IngredientUsage = {
          ...ingredient,
          actualQuantity: actualQuantityNeeded,
          deductedFromInventory: false,
          deductedAt: undefined,
          variance: 0,
          variancePercentage: 0,
        };

        // If ingredient is matched to inventory, deduct from inventory
        if (ingredient.inventoryItemId) {
          const inventoryRef = doc(db, "inventory", ingredient.inventoryItemId);
          const inventorySnap = await transaction.get(inventoryRef);

          if (inventorySnap.exists()) {
            const inventoryItem = { id: inventorySnap.id, ...inventorySnap.data() } as InventoryItem;

            // Calculate available quantity (considering reserved items)
            const reservedQty = inventoryItem.reservedQuantity || 0;
            const availableQty = inventoryItem.quantity - reservedQty;

            // Determine how much to deduct (never go below zero)
            const deductionAmount = Math.min(actualQuantityNeeded, inventoryItem.quantity);

            if (deductionAmount > 0) {
              const newQuantity = Math.max(0, inventoryItem.quantity - deductionAmount);
              const newDistributedTotal = (inventoryItem.distributedQuantity || 0) + deductionAmount;

              // Update inventory
              transaction.update(inventoryRef, {
                quantity: newQuantity,
                distributedQuantity: newDistributedTotal,
              });

              updates.push({
                itemId: inventoryItem.id!,
                oldQty: inventoryItem.quantity,
                newQty: newQuantity,
                productName: inventoryItem.productName,
              });

              // Mark as deducted
              updatedIngredient.deductedFromInventory = true;
              updatedIngredient.deductedAt = Timestamp.now();

              // Calculate variance
              const variance = actualQuantityNeeded - deductionAmount;
              updatedIngredient.variance = variance;
              updatedIngredient.variancePercentage = 
                ingredient.expectedQuantity > 0 
                  ? (variance / ingredient.expectedQuantity) * 100 
                  : 0;
            }
          }
        }

        updatedIngredientUsage.push(updatedIngredient);
      }

      // Update distribution session
      const hasVariance = updatedIngredientUsage.some(ing => 
        ing.variance !== undefined && Math.abs(ing.variance) > 0
      );

      transaction.update(sessionRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
        completedBy: userId,
        completedByName: userName,
        ingredientUsage: updatedIngredientUsage,
        hasVariance,
      });

      return { updates, hasVariance };
    });

    // Log the completion
    const completionLog: Omit<DistributionLog, 'id'> = {
      foodBankId: userId,
      distributionSessionId: sessionId,
      action: 'session_started',
      performedBy: userId,
      performedByName: userName,
      performedAt: Timestamp.now(),
      notes: `Distribution completed. ${distributedMealCount} meals distributed.`,
    };
    await addDoc(collection(db, "distribution_logs"), completionLog);

    // Log each inventory deduction
    for (const update of result.updates) {
      const deductionLog: Omit<DistributionLog, 'id'> = {
        foodBankId: userId,
        distributionSessionId: sessionId,
        action: 'inventory_deducted',
        inventoryItemId: update.itemId,
        productName: update.productName,
        quantityBefore: update.oldQty,
        quantityAfter: update.newQty,
        quantityChanged: update.oldQty - update.newQty,
        performedBy: userId,
        performedByName: userName,
        performedAt: Timestamp.now(),
        notes: `Inventory deducted for distribution`,
      };
      await addDoc(collection(db, "distribution_logs"), deductionLog);
    }

    return Response.json({
      success: true,
      message: "Distribution completed successfully",
      deductedItems: result.updates.length,
      hasVariance: result.hasVariance,
      distributedMealCount,
    });

  } catch (error: any) {
    console.error("Error completing distribution:", error);
    return Response.json(
      { error: error.message || "Failed to complete distribution" },
      { status: 500 }
    );
  }
}
