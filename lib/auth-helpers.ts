import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { User } from "firebase/auth";
import { UserProfile } from "@/types/schema";

/**
 * Creates or updates a user profile in Firestore
 * This should be called after authentication
 */
export async function createUserProfile(
  user: User,
  role: UserProfile["role"] = "donor",
  additionalData?: Partial<UserProfile>
): Promise<void> {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // User doesn't exist, create profile
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Anonymous",
      role,
      ...additionalData,
    };

    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // User exists, update if needed
    const existingData = userSnap.data() as UserProfile;
    if (existingData.role !== role || additionalData) {
      await setDoc(
        userRef,
        {
          ...existingData,
          role, // Explicitly set the role
          ...additionalData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
}

/**
 * Gets the current user's profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { uid, ...userSnap.data() } as UserProfile;
  }

  return null;
}

