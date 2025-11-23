# SharingSurplus AI

> **Bridging the gap between surplus food and community needs through AI-driven logistics.**

---

## The Team
**Ishaan Dhiman** • **Sai Amartya Balamurugan Lakshmipraba** • **Aamirali Tinwala** • **Dhairya Shah** • **Dhanika Botejue** • **Skyler Yoo**

---

## The Problem
**40% of food in North America is wasted.** Meanwhile, Canadian food banks are facing a crisis with **2.2 million visits/month** (HungerCount 2025).

Charities are overwhelmed by:
*   **Inventory Chaos:** Tracking thousands of pounds of food on paper/Excel.
*   **Logistical Nightmares:** Coordinating pickups from hundreds of donors manually.
*   **Volunteer Burnout:** Managing shifts and hours by hand.

**The Result:** Inefficiency prevents food from reaching those who need it most.

---

## The Solution
**SharingSurplus** is a dual-engine platform:

### 1. The Marketplace
A "Facebook Marketplace" for food rescue.
*   **Distributors** post surplus.
*   **Volunteers** claim pickup routes.
*   **Food Banks** receive inventory & request urgent items.

### 2. The Automation Suite
Three intelligent agents working in the background:
*   **Inventory Agent:** Scans barcodes & suggests recipes.
*   **Networking Agent:** Optimizes routes & connects stakeholders.
*   **Management Agent:** Automates volunteer scheduling.

---

## Key Features (MVP)

### For Donors
*   **Hassle-Free Posting:** Snap a photo, set a pickup window, and go.
*   **Live Requests:** See exactly what nearby food banks need *right now*.

### For Volunteers
*   **Smart Routing:** AI generates the most efficient pickup/drop-off path using **Google Maps API**.
*   **Impact Tracking:** Log hours, track deliveries, and earn badges.

### For Food Banks
*   **Instant Inventory:** Scan barcodes via **OpenFoodFacts API** or use AI Vision.
*   **Smart Meal Planning:** AI suggests recipes based on expiring stock (e.g., "Turn 500 jars of sauce into 200 meals").
*   **Automated Logistics:** Incoming shipments are tracked automatically.

---

## Challenges & Lessons Learned
Building this wasn't easy. Here's what we tackled:

*   **Merge Hell:** Coordinating 6 developers on a fast-paced codebase.
*   **AI Vision:** Pivoting SDKs to get reliable barcode/image recognition.
*   **Security:** Complex Firestore rules to keep Donor/Volunteer/Bank data separate but connected.
*   **Context Engineering:** Teaching the AI to understand "500 units" vs "500 grams" for meal planning.
*   **Smart Routing:** Real-time geolocation filtering and route optimization.
*   **API Optimization:** Delivering precise coordinates for AI routing without triggering geocoding API calls on every user keystroke.
*   **Live Data:** Moving from mock data to real-time Firestore streams.

---

## Tech Stack

- **Next.js 15**
- **TypeScript**
- **Tailwind CSS**
- **Firebase**
- **Google Gemini**
- **Google Maps API**

---

## Getting Started

1.  **Clone the repo**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file with your Firebase and Google API keys.
4.  **Run the app:**
    ```bash
    npm run dev
    ```

