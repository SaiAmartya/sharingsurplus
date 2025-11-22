import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Parse Form Data
    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const weightUnit = formData.get("weightUnit") as "kg" | "lbs";
    const expiryDateStr = formData.get("expiryDate") as string;
    const pickupWindow = formData.get("pickupWindow") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const lat = parseFloat(formData.get("lat") as string || "0");
    const lng = parseFloat(formData.get("lng") as string || "0");
    
    const photo = formData.get("photo") as File | null;

    // 3. Upload Image (if provided)
    let photoUrl = "";
    if (photo && photo.size > 0) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const fileName = `donations/${uid}/${Date.now()}_${photo.name}`;
      const bucket = adminStorage.bucket();
      const file = bucket.file(fileName);
      
      await file.save(buffer, {
        contentType: photo.type,
        public: true, // Make public or use signed URLs. For simplicity here, we'll make it public or generate a signed URL.
                      // Better: keep it private and use signed URLs, or make specific object public.
                      // Let's use makePublic() for now as per typical simple use cases, or better yet, get a signed URL.
                      // Actually, standard Firebase Client SDK uploads are usually readable if rules allow.
                      // With Admin SDK, we can make it public explicitly.
      });
      
      // Make the file public so it can be accessed directly via URL
      await file.makePublic();
      photoUrl = file.publicUrl();
    }

    // 4. Create Donation in Firestore
    // Convert weight to kg
    const weightInKg = weightUnit === "lbs" ? weight * 0.453592 : weight;

    const donationData = {
      donorId: uid,
      title,
      description: description || "",
      weight: weightInKg,
      weightUnit: "kg",
      expiryDate: Timestamp.fromDate(new Date(expiryDateStr)),
      pickupWindow,
      status: "available",
      createdAt: Timestamp.now(),
      location: {
        lat,
        lng,
        address: `${address}, ${city}`,
      },
      ...(photoUrl ? { photoUrl } : {}),
    };

    const docRef = await adminDb.collection("donations").add(donationData);

    return NextResponse.json({ id: docRef.id, message: "Donation created successfully" });
  } catch (error: any) {
    console.error("Error creating donation:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

