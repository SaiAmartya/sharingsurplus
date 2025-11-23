import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { inventoryItems } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return Response.json({ error: "GOOGLE_API_KEY is not set" }, { status: 500 });
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const itemsList = inventoryItems.map((item: any) => 
      `- ${item.productName} (${item.quantity} units, expires: ${item.expiryDate})`
    ).join('\n');

    const prompt = `
      You are a creative chef. Create ONE single, delicious recipe using the available inventory ingredients.
      
      Inventory:
      ${itemsList}
      
      Requirements:
      - Use as many expiring items as possible.
      - Keep it simple and practical.
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
