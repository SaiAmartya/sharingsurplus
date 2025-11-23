import { GoogleGenAI, FunctionCallingConfigMode, type Content, type FunctionDeclaration } from "@google/genai";
import type { ChatMessage } from "@/types/chat";

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "CREATE_ITEM",
    description: "Create a new inventory item for the authenticated food bank.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        productName: { type: "string" },
        brand: { type: "string" },
        quantity: { type: "number", description: "Number of units" },
        unitSize: { type: "string", description: "Size label, e.g. 24oz" },
        expiryDate: { type: "string", description: "ISO date string" },
        nutriScore: { type: "string" },
        barcode: { type: "string" },
        category: { type: "string" }
      },
      required: ["productName", "quantity"]
    }
  },
  {
    name: "EDIT_ITEM",
    description: "Update attributes on an inventory item.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        productName: { type: "string" },
        brand: { type: "string" },
        quantity: { type: "number" },
        unitSize: { type: "string" },
        expiryDate: { type: "string" },
        nutriScore: { type: "string" },
        barcode: { type: "string" },
        category: { type: "string" },
        notes: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "DELETE_ITEM",
    description: "Remove an inventory item by ID.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  },
  {
    name: "CREATE_RECIPE",
    description: "Generate a meal plan/recipe using the meal plan agent.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        forceRegenerate: { type: "boolean" },
        notes: { type: "string" }
      }
    }
  },
  {
    name: "EDIT_RECIPE",
    description: "Update properties of a saved recipe.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        recipeId: { type: "string" },
        patch: {
          type: "object",
          description: "Partial recipe payload to merge",
          additionalProperties: true
        }
      },
      required: ["recipeId", "patch"]
    }
  },
  {
    name: "DELETE_RECIPE",
    description: "Delete a saved recipe by ID.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        recipeId: { type: "string" }
      },
      required: ["recipeId"]
    }
  },
  {
    name: "REQUEST_FOOD",
    description: "Broadcast a food request to donors.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        item: { type: "string" },
        quantity: { type: "string" },
        urgency: { type: "string", enum: ["high", "medium", "low"] },
        details: { type: "string" }
      },
      required: ["item", "urgency"]
    }
  },
  {
    name: "MANAGE_VOLUNTEER",
    description: "Create, update, or delete volunteer records.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create", "update", "delete"] },
        volunteerId: { type: "string" },
        payload: {
          type: "object",
          additionalProperties: true,
          description: "Fields to set when creating or updating a volunteer."
        }
      },
      required: ["action"]
    }
  },
  {
    name: "SEE_LOGISTICS",
    description: "Retrieve the current incoming logistics status feed.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        includeAccepted: { type: "boolean" },
        includeOpen: { type: "boolean" }
      }
    }
  },
  {
    name: "CREATE_MEMORY",
    description: "Store an operational memory for future recommendations.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        note: { type: "string" },
        category: { type: "string" },
        decayDays: { type: "number", description: "How many days until this memory should expire." }
      },
      required: ["note"]
    }
  }
];

const serializeMessages = (messages: ChatMessage[] = []): Content[] => {
  return messages.map((message) => {
    if (message.role === "tool-call") {
      return {
        role: "model",
        parts: [
          {
            functionCall: {
              name: message.name,
              args: message.args ?? {},
              id: message.toolCallId
            }
          }
        ]
      } satisfies Content;
    }

    if (message.role === "tool") {
      return {
        role: "tool",
        parts: [
          {
            functionResponse: {
              name: message.name,
              response: message.response,
              id: message.toolCallId
            }
          }
        ]
      } satisfies Content;
    }

    return {
      role: message.role,
      parts: [{ text: message.content }]
    } satisfies Content;
  });
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systemPrompt, messages } = body as {
      systemPrompt?: string;
      messages?: ChatMessage[];
    };

    if (!process.env.GOOGLE_API_KEY) {
      return Response.json({ error: "GOOGLE_API_KEY is not set" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const contents: Content[] = serializeMessages(messages ?? []);

    if (systemPrompt) {
      contents.unshift({
        role: "user",
        parts: [{ text: `System instructions:\n${systemPrompt}` }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        temperature: 0.3,
        topP: 0.8,
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: toolDeclarations.map((tool) => tool.name ?? "")
          }
        },
        tools: [{ functionDeclarations: toolDeclarations }]
      }
    });

    return Response.json({
      text: response.text,
      functionCalls: response.functionCalls,
      usageMetadata: response.usageMetadata
    });
  } catch (error) {
    console.error("Chat API error", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to process chat request"
      },
      { status: 500 }
    );
  }
}
