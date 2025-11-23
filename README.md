# Shurplus

## The Team
- **Ishaan Dhiman**
- **Sai Amartya Balamurugan Lakshmipraba**
- **Aamirali Tinwala**
- **Dhairya Shah**
- **Dhanika Botejue**
- **Skyler Yoo**

---

## The Problem
**40% of food in North America is wasted.** Meanwhile, Canadian food banks are facing a crisis with **2.2 million visits per month** (HungerCount 2025).

Charities are overwhelmed by:
*   **Inventory Chaos:** Tracking thousands of pounds of food manually on paper or Excel.
*   **Logistical Nightmares:** Coordinating pickups from hundreds of donors without a centralized system.
*   **Volunteer Burnout:** Managing shifts, hours, and routes by hand is time-consuming and inefficient.

**The Result:** Operational inefficiencies prevent surplus food from reaching those who need it most.

---

## The Solution
**Shurplus** is a dual-engine platform designed to bridge this gap:

### 1. The Marketplace
Operates like a "Facebook Marketplace" for food rescue:
*   **Distributors** post surplus food offers.
*   **Volunteers** claim optimized pickup routes.
*   **Food Banks** receive inventory updates and request urgent items.

### 2. The Automation Suite
Three intelligent agents work in the background to streamline operations:
*   **Inventory Agent:** Scans barcodes and suggests recipes based on available stock.
*   **Networking Agent:** Optimizes delivery routes and connects stakeholders.
*   **Management Agent:** Automates volunteer scheduling and tracking.

---

## Key Features (MVP)

### For Donors
*   **Hassle-Free Posting:** Simply snap a photo, set a pickup window, and post.
*   **Live Requests:** View real-time needs from nearby food banks to donate what's needed most.

### For Volunteers
*   **Smart Routing:** AI generates the most efficient pickup and drop-off paths using the **Google Maps API**.
*   **Impact Tracking:** Automatically log hours, track deliveries, and earn recognition badges.

### For Food Banks
*   **Instant Inventory:** Add items instantly via **OpenFoodFacts API** barcode scanning or AI Vision.
*   **Smart Meal Planning:** AI analyzes expiring stock to suggest mass-feeding recipes (e.g., "Turn 500 jars of sauce into 200 meals").
*   **Automated Logistics:** Incoming shipments are tracked automatically, reducing manual entry.

---

## Challenges & Lessons Learned
Building Shurplus presented several technical and logistical hurdles:

*   **Version Control & Collaboration:** Managing a fast-paced codebase with 6 developers required strict coordination to avoid merge conflicts.
*   **AI Vision Integration:** We had to pivot between SDKs to ensure reliable barcode and image recognition.
*   **Data Security:** Designing complex Firestore rules was essential to keep Donor, Volunteer, and Food Bank data secure yet interconnected.
*   **Prompt Engineering:** Teaching the AI to distinguish between "500 units" and "500 grams" was critical for accurate meal planning.
*   **AI Calibration for Storage:** Calibrating the AI to accurately estimate storage needs and distribution logistics required iterative testing.
*   **Smart Routing Logic:** We implemented real-time geolocation filtering and route optimization to ensure efficient delivery paths.
*   **API Optimization:** We optimized the geocoding process to deliver precise coordinates for AI routing without triggering excessive API calls on every keystroke.
*   **Live Data Integration:** Transitioning from static mock data to real-time Firestore streams required robust error handling and state management.

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

### Prerequisites
*   **Node.js:** v18.17 or higher (v20+ recommended)
*   **npm** or **yarn**

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/SaiAmartya/sharingsurplus.git
    cd sharingsurplus
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Firebase Setup**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Create a new project.
    *   **Authentication:** Enable **Google** and **Email/Password** providers.
    *   **Firestore Database:** Create a database (start in test mode for development).
    *   **Project Settings:** Go to General > Your apps > Web app. Register the app and copy the `firebaseConfig` object.

4.  **Google APIs Setup**
    *   **Gemini AI:** Get an API key from [Google AI Studio](https://aistudio.google.com/).
    *   **Google Maps:**
        *   Go to [Google Cloud Console](https://console.cloud.google.com/).
        *   Enable **Maps JavaScript API**, **Places API**, and **Distance Matrix API**.
        *   Create an API Key.

5.  **Environment Variables**
    Create a `.env.local` file in the root directory and add the following keys:

    ```env
    # Firebase Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # AI & Maps
    GOOGLE_API_KEY=your_gemini_api_key
    MAPS_API=your_google_maps_api_key
    ```

6.  **Run the development server**
    ```bash
    npm run dev
    ```
    