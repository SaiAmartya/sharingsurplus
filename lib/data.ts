import { db } from "./firebase";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { Donation, UserProfile } from "@/types/schema";

export async function getActiveDonations(): Promise<Donation[]> {
  try {
    const donationsRef = collection(db, "donations");
    const q = query(donationsRef, where("status", "==", "available"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Donation));
  } catch (error) {
    console.error("Error fetching donations:", error);
    return [];
  }
}

export async function getFoodBanks(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "foodbank"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as UserProfile;
      return {
        ...data,
        uid: doc.id || data.uid,
      };
    });
  } catch (error) {
    console.error("Error fetching foodbanks:", error);
    return [];
  }
}

export async function getUserProfilesByIds(
  userIds: string[]
): Promise<Record<string, UserProfile>> {
  if (userIds.length === 0) {
    return {};
  }

  const usersRef = collection(db, "users");
  const chunks: string[][] = [];

  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }

  const results: Record<string, UserProfile> = {};

  for (const chunk of chunks) {
    try {
      const q = query(usersRef, where(documentId(), "in", chunk));
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        results[doc.id] = {
          ...data,
          uid: doc.id || data.uid,
        };
      });
    } catch (error) {
      console.error("Error fetching user profiles chunk:", error);
    }
  }

  return results;
}

