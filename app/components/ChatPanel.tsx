"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { encode as encodeToon } from "@toon-format/toon";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/context/AuthContext";
import { getUserProfile } from "@/lib/auth-helpers";
import type { UserProfile, UrgentRequest } from "@/types/schema";
import type { ChatMessage, ToolResponseMessage } from "@/types/chat";

interface InventorySummary {
  id: string;
  productName: string;
  brand?: string;
  quantity: number;
  unitSize?: string;
  expiryDate?: string | null;
  nutriScore?: string;
  barcode?: string;
  category?: string;
}

interface SavedRecipeSummary {
  id: string;
  name: string;
  description: string;
  servings: string;
  difficulty: string;
  prepTime: string;
  calories: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  updatedAt?: string | null;
}

interface VolunteerSummary {
  id: string;
  name: string;
  role?: string;
  hours?: string;
  logs?: string;
}

interface MemoryNote {
  id: string;
  note: string;
  category?: string;
  decayDays?: number;
  createdAt?: string;
  expiresAt?: string;
}

interface ModelResponsePayload {
  text?: string;
  functionCalls?: {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  }[];
}

const initialAssistantMessage: ChatMessage = {
  id: "assistant-intro",
  role: "model",
  content:
    "Hi! I'm your Shurplus Operations Copilot. Ask me to triage inventory, spin up meal plans, route volunteers, or log operational memories."
};

const quickPrompts = [
  {
    label: "Plan expiring stock",
    prompt: "Highlight items expiring in 24h and suggest how to redeploy them."
  },
  {
    label: "Volunteer coverage",
    prompt: "Check today's volunteer roster and flag any delivery gaps."
  },
  {
    label: "Incoming logistics",
    prompt: "Summarize active deliveries and what needs confirmation on arrival."
  },
  {
    label: "Meal plan idea",
    prompt: "Draft a high-volume meal plan using the largest surplus ingredients."
  }
];

const ChatPanel = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<InventorySummary[]>([]);
  const [recipes, setRecipes] = useState<SavedRecipeSummary[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerSummary[]>([]);
  const [logistics, setLogistics] = useState<UrgentRequest[]>([]);
  const [memories, setMemories] = useState<MemoryNote[]>([]);

  const messagesRef = useRef<ChatMessage[]>(messages);
  const inventoryRef = useRef<InventorySummary[]>(inventory);
  const recipesRef = useRef<SavedRecipeSummary[]>(recipes);
  const logisticsRef = useRef<UrgentRequest[]>(logistics);
  const volunteersRef = useRef<VolunteerSummary[]>(volunteers);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    recipesRef.current = recipes;
  }, [recipes]);

  useEffect(() => {
    logisticsRef.current = logistics;
  }, [logistics]);

  useEffect(() => {
    volunteersRef.current = volunteers;
  }, [volunteers]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    getUserProfile(user.uid)
      .then((profileData) => {
        if (isMounted) {
          setProfile(profileData ?? null);
        }
      })
      .catch((error) => {
        console.error("Failed to load profile", error);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setInventory([]);
      return;
    }

    const inventoryQuery = query(
      collection(db, "inventory"),
      where("foodBankId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(inventoryQuery, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          productName: data.productName || "",
          brand: data.brand || "",
          quantity: data.quantity || 0,
          unitSize: data.unitSize || "",
          expiryDate: data.expiryDate?.toDate().toISOString() ?? null,
          nutriScore: data.nutriScore || "?",
          barcode: data.barcode || "",
          category: data.category || ""
        } satisfies InventorySummary;
      });
      setInventory(items);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      return;
    }

    const recipeQuery = query(
      collection(db, "saved_recipes"),
      where("foodBankId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(recipeQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const recipe = data.recipe || {};
        return {
          id: docSnap.id,
          name: recipe.name || "Untitled",
          description: recipe.description || "",
          servings: recipe.servings || "",
          difficulty: recipe.difficulty || "",
          prepTime: recipe.prepTime || "",
          calories: recipe.calories || "",
          ingredients: recipe.ingredients || [],
          steps: recipe.steps || [],
          tags: recipe.tags || [],
          updatedAt: data.updatedAt?.toDate().toISOString() ?? data.createdAt?.toDate().toISOString() ?? null
        } satisfies SavedRecipeSummary;
      });
      setRecipes(docs);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setVolunteers([]);
      return;
    }

    const volunteerQuery = query(collection(db, "volunteers"), where("foodbankId", "==", user.uid));

    const unsubscribe = onSnapshot(volunteerQuery, (snapshot) => {
      const entries = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "",
          role: data.role || "",
          hours: data.hours || "",
          logs: data.logs || ""
        } satisfies VolunteerSummary;
      });
      setVolunteers(entries);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLogistics([]);
      return;
    }

    const requestsQuery = query(collection(db, "requests"), where("foodBankId", "==", user.uid));

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const entries = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as UrgentRequest) }))
        .filter((req) => req.status === "accepted" || req.status === "open");
      setLogistics(entries);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMemories([]);
      return;
    }

    const memoriesQuery = query(
      collection(db, "chat_memories"),
      where("foodBankId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(memoriesQuery, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          note: data.note || "",
          category: data.category || "general",
          decayDays: data.decayDays || undefined,
          createdAt: data.createdAt?.toDate().toISOString(),
          expiresAt: data.expiresAt?.toDate().toISOString()
        } satisfies MemoryNote;
      });
      setMemories(items);
    });

    return () => unsubscribe();
  }, [user]);

  const systemPrompt = useMemo(() => {
    const mission =
      "You are Shurplus Logistics Copilot, an intelligent assistant for food bank operations. Your goal is to help manage inventory, logistics, volunteers, and meal planning efficiently.";
    const guardrails = [
      "Prefer issuing structured tool calls for CRUD actions or to log insights in CREATE_MEMORY.",
      "Ask clarifying questions when information is missing rather than guessing.",
      "Keep responses concise, action-oriented, and focused on next best steps.",
      "When executing tool calls, provide a brief, natural language confirmation of what you are doing.",
      "Use the Context_TOON data to ground your answers about current inventory, recipes, volunteers, and logistics.",
      "If a user's request is ambiguous, ask for clarification before acting."
    ];

    const fewShotExamples = `
Few-Shot Examples:

User: "We received 50 lbs of carrots today."
Model: "I'll add those carrots to your inventory right away."
Tool Call: CREATE_ITEM({ productName: "Carrots", quantity: 50, unitSize: "lbs", category: "produce" })

User: "I need a recipe for all this spinach."
Model: "I can help with that. Let me generate a meal plan that uses a large amount of spinach from your inventory."
Tool Call: CREATE_RECIPE({ notes: "Focus on using surplus spinach" })

User: "Who is volunteering today?"
Model: "Let me check the volunteer roster for you."
(Refers to Context_TOON volunteers data)
Model: "You have 3 volunteers scheduled: Alice, Bob, and Charlie."

User: "Log a memory that we are low on rice."
Model: "I'll make a note of that for future reference."
Tool Call: CREATE_MEMORY({ note: "Low on rice stock", category: "inventory" })
`;

    const contextPayload = {
      snapshot: {
        foodBank: {
          name: profile?.organizationName || profile?.displayName || "Unknown Food Bank",
          region: profile?.location?.address || "Unknown",
          dropoffAddress: profile?.dropoffAddress || "",
          receivingHours: profile?.receivingHours || "",
          storageCapabilities: profile?.storageCapabilities || [],
          volunteerCount: volunteers.length,
          memoryHighlights: memories.slice(0, 5)
        },
        stats: {
          inventoryCount: inventory.length,
          savedRecipes: recipes.length,
          incomingDeliveries: logistics.length
        }
      },
      inventory: inventory.slice(0, 60),
      recipes: recipes.slice(0, 25),
      volunteers: volunteers.slice(0, 40),
      logistics: logistics,
      memories: memories.slice(0, 15)
    };

    const toonBlock = encodeToon(contextPayload);
    const guardrailText = guardrails.map((line) => `- ${line}`).join("\n");

    return `${mission}\n\nGuardrails:\n${guardrailText}\n${fewShotExamples}\n\nContext_TOON:\n${toonBlock}`;
  }, [inventory, recipes, volunteers, logistics, profile, memories]);

  const heroStats = useMemo(
    () => [
      { label: "Items in stock", value: inventory.length.toString().padStart(2, "0") },
      { label: "Saved recipes", value: recipes.length.toString().padStart(2, "0") },
      { label: "Active deliveries", value: logistics.length.toString().padStart(2, "0") },
      { label: "Volunteers synced", value: volunteers.length.toString().padStart(2, "0") }
    ],
    [inventory.length, recipes.length, logistics.length, volunteers.length]
  );

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const callModel = useCallback(
    async (conversation: ChatMessage[]): Promise<ModelResponsePayload> => {
      if (!systemPrompt) {
        throw new Error("System prompt is not ready yet.");
      }

      console.log("--- FULL SYSTEM PROMPT ---");
      console.log(systemPrompt);
      console.log("--------------------------");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: conversation
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorBody.error || "Chat service unavailable");
      }

      return (await response.json()) as ModelResponsePayload;
    },
    [systemPrompt]
  );

  const parseDateArg = (value?: unknown): Timestamp | null => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
  };

  const numericOrNull = (value: unknown): number | null => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const executeTool = useCallback(
    async (call: { id?: string; name?: string; args?: Record<string, unknown> }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const toolName = call.name?.toUpperCase();
      const args = call.args ?? {};

      switch (toolName) {
        case "CREATE_ITEM": {
          const quantity = numericOrNull(args.quantity);
          if (!args.productName || quantity === null) {
            return { success: false, message: "productName and quantity are required" };
          }

          const docRef = await addDoc(collection(db, "inventory"), {
            foodBankId: user.uid,
            productName: args.productName,
            brand: args.brand || "",
            quantity,
            unitSize: args.unitSize || "",
            expiryDate: parseDateArg(args.expiryDate),
            nutriScore: (args.nutriScore || "?").toString().toUpperCase(),
            barcode: args.barcode || "",
            category: args.category || "",
            createdAt: Timestamp.now()
          });

          return { success: true, id: docRef.id };
        }
        case "EDIT_ITEM": {
          if (!args.id) {
            return { success: false, message: "id is required" };
          }
          const updatePayload: Record<string, unknown> = {};
          const updatableFields = ["productName", "brand", "unitSize", "nutriScore", "barcode", "category", "notes"];
          updatableFields.forEach((field) => {
            if (args[field] !== undefined) {
              updatePayload[field] = args[field];
            }
          });
          if (args.quantity !== undefined) {
            const nextQuantity = numericOrNull(args.quantity);
            if (nextQuantity !== null) {
              updatePayload.quantity = nextQuantity;
            }
          }
          const maybeExpiry = parseDateArg(args.expiryDate);
          if (maybeExpiry) {
            updatePayload.expiryDate = maybeExpiry;
          }
          if (Object.keys(updatePayload).length === 0) {
            return { success: false, message: "No editable fields were provided" };
          }
          await updateDoc(doc(db, "inventory", String(args.id)), updatePayload);
          return { success: true, id: args.id };
        }
        case "DELETE_ITEM": {
          if (!args.id) {
            return { success: false, message: "id is required" };
          }
          await deleteDoc(doc(db, "inventory", String(args.id)));
          return { success: true };
        }
        case "CREATE_RECIPE": {
          const inventorySnapshot = inventoryRef.current.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitSize: item.unitSize,
            expiryDate: item.expiryDate
          }));

          const response = await fetch("/api/generate-meal-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inventoryItems: inventorySnapshot })
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: "Failed to generate" }));
            throw new Error(errorBody.error || "Meal plan generation failed");
          }

          const recipe = await response.json();
          return { success: true, recipe };
        }
        case "EDIT_RECIPE": {
          if (!args.recipeId || !args.patch) {
            return { success: false, message: "recipeId and patch are required" };
          }
          await updateDoc(doc(db, "saved_recipes", String(args.recipeId)), {
            recipe: { ...args.patch },
            updatedAt: Timestamp.now()
          });
          return { success: true };
        }
        case "DELETE_RECIPE": {
          if (!args.recipeId) {
            return { success: false, message: "recipeId is required" };
          }
          await deleteDoc(doc(db, "saved_recipes", String(args.recipeId)));
          return { success: true };
        }
        case "REQUEST_FOOD": {
          if (!args.item || !args.urgency) {
            return { success: false, message: "item and urgency are required" };
          }
          await addDoc(collection(db, "requests"), {
            foodBankId: user.uid,
            foodBankName: profile?.organizationName || profile?.displayName || "Food Bank",
            item: args.item,
            quantity: args.quantity || "",
            details: args.details || "",
            urgency: args.urgency,
            status: "open",
            createdAt: Timestamp.now()
          });
          return { success: true };
        }
        case "MANAGE_VOLUNTEER": {
          const action = String(args.action || "").toLowerCase();
          if (!action) {
            return { success: false, message: "action is required" };
          }
          if (action === "create") {
            const payload = (args.payload || {}) as Record<string, unknown> & { name?: string };
            if (!payload.name || typeof payload.name !== "string") {
              return { success: false, message: "Volunteer name is required" };
            }
            const docRef = await addDoc(collection(db, "volunteers"), {
              foodbankId: user.uid,
              ...payload
            });
            return { success: true, id: docRef.id };
          }
          if (!args.volunteerId) {
            return { success: false, message: "volunteerId is required for update/delete" };
          }
          if (action === "update") {
            await updateDoc(doc(db, "volunteers", String(args.volunteerId)), args.payload || {});
            return { success: true };
          }
          if (action === "delete") {
            await deleteDoc(doc(db, "volunteers", String(args.volunteerId)));
            return { success: true };
          }
          return { success: false, message: `Unsupported action: ${action}` };
        }
        case "SEE_LOGISTICS": {
          return {
            success: true,
            deliveries: logisticsRef.current.map((req) => ({
              id: req.id,
              item: req.item,
              status: req.status,
              acceptedByName: req.acceptedByName,
              createdAt: req.createdAt?.toDate().toISOString()
            }))
          };
        }
        case "CREATE_MEMORY": {
          if (!args.note) {
            return { success: false, message: "note is required" };
          }
          const decayDays = numericOrNull(args.decayDays) ?? 7;
          const now = Timestamp.now();
          const expiresAt = Timestamp.fromMillis(now.toMillis() + decayDays * 24 * 60 * 60 * 1000);
          const docRef = await addDoc(collection(db, "chat_memories"), {
            foodBankId: user.uid,
            note: args.note,
            category: args.category || "general",
            decayDays,
            createdAt: now,
            expiresAt
          });
          return { success: true, id: docRef.id };
        }
        default:
          return { success: false, message: `Unsupported tool ${toolName}` };
      }
    },
    [profile?.displayName, profile?.organizationName, user]
  );

  const processConversation = useCallback(
    async (conversation: ChatMessage[]) => {
      setIsProcessing(true);
      let workingConversation = [...conversation];
      const MAX_TURNS = 5;
      let turnCount = 0;

      try {
        while (turnCount < MAX_TURNS) {
          turnCount++;
          const response = await callModel(workingConversation);

          if (response.text) {
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: "model",
              content: response.text
            };
            workingConversation = [...workingConversation, assistantMessage];
            appendMessage(assistantMessage);
          }

          if (response.functionCalls && response.functionCalls.length > 0) {
            for (const call of response.functionCalls) {
              const callId = call.id || crypto.randomUUID();
              const callMessage: ChatMessage = {
                id: `${callId}-call`,
                role: "tool-call",
                name: call.name || "UNKNOWN_TOOL",
                args: call.args ?? {},
                toolCallId: callId
              };
              workingConversation = [...workingConversation, callMessage];
              appendMessage(callMessage);

              try {
                const result = await executeTool(call);
                const responseMessage: ChatMessage = {
                  id: `${callId}-response`,
                  role: "tool",
                  name: call.name || "UNKNOWN_TOOL",
                  response: { ...result },
                  toolCallId: callId
                };
                workingConversation = [...workingConversation, responseMessage];
                appendMessage(responseMessage);
              } catch (toolError) {
                const responseMessage: ChatMessage = {
                  id: `${callId}-response`,
                  role: "tool",
                  name: call.name || "UNKNOWN_TOOL",
                  response: {
                    success: false,
                    message: toolError instanceof Error ? toolError.message : "Tool execution failed"
                  },
                  toolCallId: callId
                };
                workingConversation = [...workingConversation, responseMessage];
                appendMessage(responseMessage);
              }
            }
            continue;
          }

          break;
        }
      } catch (error) {
        appendMessage({
          id: crypto.randomUUID(),
          role: "model",
          content: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}`
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [appendMessage, callModel, executeTool]
  );

  const sendUserMessage = useCallback(
    async (rawMessage: string) => {
      const trimmed = rawMessage.trim();
      if (!trimmed || !user) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed
      };

      const updatedConversation = [...messagesRef.current, userMessage];
      appendMessage(userMessage);
      await processConversation(updatedConversation);
    },
    [appendMessage, processConversation, user]
  );

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isProcessing || !input.trim()) return;
    const pendingInput = input;
    setInput("");
    await sendUserMessage(pendingInput);
  };

  const handleQuickPrompt = useCallback(
    async (prompt: string) => {
      if (isProcessing) return;
      setInput("");
      await sendUserMessage(prompt);
    },
    [isProcessing, sendUserMessage]
  );

  const formatToolLabel = (name?: string) => {
    if (!name) return "System action";
    return name
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const describeAction = (name?: string, rawArgs: Record<string, unknown> = {}) => {
    const upper = name?.toUpperCase();
    switch (upper) {
      case "REQUEST_FOOD":
        return `Requesting ${rawArgs.quantity ?? ""} ${rawArgs.item ?? "supplies"}`.trim();
      case "CREATE_ITEM":
        return `Adding ${rawArgs.quantity ?? "new"} units of ${rawArgs.productName ?? "an item"}`;
      case "EDIT_ITEM":
        return `Updating inventory item ${rawArgs.productName ?? rawArgs.id ?? ""}`.trim();
      case "DELETE_ITEM":
        return `Removing inventory item ${rawArgs.id ?? ""}`.trim();
      case "CREATE_RECIPE":
        return "Analyzing inventory to design a meal plan...";
      case "MANAGE_VOLUNTEER":
        return `${rawArgs.action ? rawArgs.action.toString().toUpperCase() : "Managing"} volunteer ${
          (rawArgs.payload as Record<string, unknown> | undefined)?.name || rawArgs.volunteerId || ""
        }`.trim();
      case "SEE_LOGISTICS":
        return "Refreshing incoming deliveries";
      case "CREATE_MEMORY":
        return `Saving memory (${rawArgs.category ?? "general"})`;
      default:
        return `Running ${formatToolLabel(name)}`;
    }
  };

  const formatArgsPreview = (payload?: Record<string, unknown>) => {
    if (!payload) return "Awaiting details";
    const preview = Object.entries(payload)
      .filter(([, value]) => value !== undefined && value !== "" && typeof value !== "object")
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`);
    return preview.length ? preview.join(" • ") : "No additional details";
  };

  const formatResultSummary = (name?: string, payload?: Record<string, unknown>) => {
    if (!payload) return "Completed";
    if (typeof payload.message === "string") {
      return payload.message;
    }
    const upper = name?.toUpperCase();
    switch (upper) {
      case "CREATE_RECIPE": {
        const recipeInfo = payload.recipe as { name?: string } | undefined;
        return `Meal plan ready: ${recipeInfo?.name ?? "New recipe"}`;
      }
      case "REQUEST_FOOD":
        return "Donation request dispatched";
      case "CREATE_ITEM":
        return `Logged item #${payload.id ?? ""}`.trim();
      case "MANAGE_VOLUNTEER":
        return "Volunteer roster updated";
      case "SEE_LOGISTICS":
        return `Loaded ${Array.isArray(payload.deliveries) ? payload.deliveries.length : 0} deliveries`;
      case "CREATE_MEMORY":
        return "Memory saved";
      default:
        if (payload.id) {
          return `Operation complete (id: ${payload.id})`;
        }
        return "Operation complete";
    }
  };

  const toolResponses = useMemo(() => {
    const map = new Map<string, ToolResponseMessage>();
    messages.forEach((message) => {
      if (message.role === "tool" && message.toolCallId) {
        map.set(message.toolCallId, message);
      }
    });
    return map;
  }, [messages]);

  const renderStatusIcon = (status: "pending" | "success" | "error") => {
    if (status === "pending") {
      return (
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
          <span className="h-4 w-4 rounded-full border-2 border-nb-blue border-t-transparent animate-spin" />
        </span>
      );
    }
    if (status === "success") {
      return (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-lg font-bold">
          ✓
        </span>
      );
    }
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-nb-red/10 text-nb-red text-lg font-bold">
        !
      </span>
    );
  };

  if (!user) {
    return (
      <section className="nb-card p-6 rounded-3xl border border-slate-100 bg-white">
        <h3 className="font-display text-xl font-bold text-nb-ink mb-1">Operations Copilot</h3>
        <p className="text-sm text-slate-500">Sign in to chat with the logistics assistant.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6">
        <div className="flex flex-wrap gap-2 mb-5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              className="px-4 py-2 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:text-nb-blue hover:border-nb-blue transition-colors disabled:opacity-40"
              onClick={() => handleQuickPrompt(prompt.prompt)}
              disabled={isProcessing}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="space-y-4 h-80 overflow-y-auto pr-2 pb-2">
          {messages.map((message) => {
            if (message.role === "tool") {
              return null;
            }

            if (message.role === "tool-call") {
              const response = message.toolCallId ? toolResponses.get(message.toolCallId) : undefined;
              const args = (message.args || {}) as Record<string, unknown>;
              const responsePayload = (response?.response as Record<string, unknown> | undefined) ?? undefined;
              const wasSuccessful = responsePayload?.success === false ? false : Boolean(response);
              const status: "pending" | "success" | "error" = response
                ? wasSuccessful
                  ? "success"
                  : "error"
                : "pending";

              const isRecipeAgent = message.name === "CREATE_RECIPE";
              const containerClasses = isRecipeAgent
                ? "bg-gradient-to-br from-violet-50 to-white border-violet-100 shadow-sm"
                : "bg-slate-50 border-slate-200";

              const labelText = isRecipeAgent ? "Meal Planning Agent" : formatToolLabel(message.name);
              const labelColor = isRecipeAgent ? "text-violet-600" : "text-slate-500";
              const statusLabel =
                status === "pending" ? "Working..." : status === "success" ? "Done" : "Failed";

              return (
                <div key={message.id} className="flex items-start gap-3 my-2">
                  {renderStatusIcon(status)}
                  <div className={`flex-1 rounded-2xl border px-4 py-3 ${containerClasses}`}>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className={`flex items-center gap-2 ${labelColor}`}>
                        {isRecipeAgent && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-[10px]">
                            ✦
                          </span>
                        )}
                        {labelText}
                      </span>
                      <span
                        className={`text-[10px] ${
                          status === "success"
                            ? "text-emerald-600 opacity-80"
                            : status === "error"
                              ? "text-nb-red"
                              : "text-slate-400"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-700 leading-snug">
                      {describeAction(message.name, args)}
                    </p>
                  </div>
                </div>
              );
            }

            const isUser = message.role === "user";
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${
                    isUser
                      ? "bg-nb-blue text-white"
                      : "bg-slate-50 text-slate-700 border border-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="mt-4 flex items-center gap-3">
          <div className="flex-1 flex items-center rounded-2xl border border-slate-200 px-4 py-2 focus-within:border-nb-blue">
            <input
              type="text"
              className="w-full border-none bg-transparent text-sm focus:outline-none"
              placeholder="Ask for a delivery update or next best action..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            className="bg-nb-blue text-white text-sm font-bold px-5 py-2 rounded-2xl disabled:opacity-50"
            disabled={isProcessing || !input.trim()}
          >
            {isProcessing ? "Thinking" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ChatPanel;
