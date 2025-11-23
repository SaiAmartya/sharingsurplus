import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
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
    
    return snapshot.docs.map(doc => ({
      uid: doc.id, // Assuming doc.id matches uid, or use doc.data().uid
      ...doc.data()
    } as UserProfile));
  } catch (error) {
    console.error("Error fetching foodbanks:", error);
    return [];
  }
}

