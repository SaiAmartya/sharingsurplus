import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { inventoryItems } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return Response.json({ error: "GOOGLE_API_KEY is not set" }, { status: 500 });
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const itemsList = inventoryItems.map((item: any) => 
      `- ${item.productName} (Count: ${item.quantity}, Size: ${item.unitSize || 'Unknown'})`
    ).join('\n');

    const prompt = `
      You are a professional chef planning meals for a FOOD BANK. 
      Your goal is to create a recipe that feeds a LARGE number of people using the available inventory.
      
      Inventory:
      ${itemsList}
      
      CRITICAL INSTRUCTIONS FOR QUANTITY:
      - "Count" is the number of containers/items.
      - "Size" is the size of ONE container.
      - TOTAL AMOUNT = Count * Size.
      - Example: "Count: 500, Size: 24oz" means you have 500 jars of 24oz each. That is 12,000oz of food!
      - Do NOT assume "500" means 500 grams total. It means 500 UNITS.
      
      Requirements:
      - Create a recipe suitable for mass feeding or distribution.
      - Calculate "Servings" based on the TOTAL AMOUNT available.
      - If you have 500 jars of sauce, you can feed hundreds of people.
      - Explicitly state the quantity of each ingredient used (e.g., "500 jars (12,000oz)").
      - Return JSON ONLY.
      
      JSON Structure:
      {
        "name": "Recipe Name",
        "description": "A very short, appetizing description (max 15 words).",
        "prepTime": "XX mins",
        "difficulty": "Easy/Medium/Hard",
        "calories": "XXX kcal",
        "servings": "X people",
        "ingredients": ["Qty Item", "Qty Item"],
        "steps": ["Step 1 instruction...", "Step 2 instruction..."],
        "tags": ["Tag1", "Tag2"]
      }
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const text = response.text;
    // Clean up potential markdown code blocks if the model adds them despite instructions
    const cleanText = text?.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return Response.json(JSON.parse(cleanText || '{}'));
  } catch (error: any) {
    console.error("Error generating meal plan:", error);
    return Response.json({ error: error.message || "Failed to generate meal plan" }, { status: 500 });
  }
}
