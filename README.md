# SharingSurplus

**Empowering communities to share surplus food efficiently through technology.**

## The Team
- **Aamirali Tinwala**
- **Dhairya Shah**
- **Dhanika Botejue**
- **Sai Amartya Balamurugan Lakshmipraba**
- **Skyler Yoo**
- **Ishaan Dhiman**

---

## Project Overview
SharingSurplus is a comprehensive platform connecting food donors, volunteers, and food banks. Our mission is to reduce food waste and combat hunger by streamlining the logistics of food rescue. We leverage cutting-edge AI and geolocation services to make the process seamless for everyone involved.

---

## Key Features & Technical Challenges

### 1. 🗺️ AI-Powered Smart Routing
**Importance:** Volunteers need the most efficient path to collect donations and deliver them to food banks to save time and fuel.
**The Challenge:** Implementing this required complex integration of **Google Maps API** with **Generative AI**. We had to calculate distances in real-time, filter donations within a 20km radius, and use AI to optimize the stop order, all while handling asynchronous data streams from Firebase.

### 2. 👨‍🍳 Intelligent Meal Planning
**Importance:** Food banks often receive random assortments of ingredients. Our AI helps them turn "500 jars of sauce" into a viable meal plan for hundreds of people.
**The Challenge:** We utilized **Google GenAI** to analyze inventory. The difficulty lay in "prompt engineering" the model to understand mass-feeding contexts—teaching it that "Count: 500" meant 500 units, not 500 grams—and forcing it to output structured JSON data for our UI to render.

### 3. 📱 Barcode Scanning & Inventory Management
**Importance:** Manual entry is slow and error-prone. Scanning allows for instant inventory updates.
**The Challenge:** We integrated **Quagga2** for browser-based scanning and the **Open Food Facts API** to automatically fetch nutritional data, allergens, and product images. Synchronizing this real-time data with **Firebase Firestore** ensured that all users saw up-to-date inventory levels instantly.

### 4. 🔐 Role-Based Ecosystem
**Importance:** Donors, Volunteers, and Food Banks have vastly different needs and workflows.
**The Challenge:** We built a robust **Role-Based Access Control (RBAC)** system using React Context (`AuthContext`, `RoleContext`). Managing state across three distinct user flows while maintaining a secure and seamless onboarding experience was a significant architectural hurdle.

### 5. 🎨 Neo-Bauhaus Design System
**Importance:** A friendly, accessible interface encourages community participation.
**The Challenge:** We moved away from standard templates to a custom "Soft Geometry" design language. Translating abstract concepts like "playful functionality" into precise **Tailwind CSS** utility classes and reusable components required a high attention to detail.

---

## 🛤️ Our Journey
Our journey began with a simple idea: connecting food to those who need it. 
- **Phase 1:** We started by building the core infrastructure with Next.js and Firebase.
- **Phase 2:** We realized logistics were a bottleneck, leading to the development of the Smart Routing system.
- **Phase 3:** To add value for food banks, we introduced the AI Meal Planner.
- **Recent Updates:** We've recently refactored our logic for handling flagged items and optimized our database queries to ensure the app scales smoothly as more users join.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend/Auth:** Firebase (Firestore, Auth)
- **AI:** Google GenAI (Gemini)
- **Maps:** Google Maps API
- **Data:** Open Food Facts API

---

## 🏁 Getting Started

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   Create a `.env.local` file with your Firebase and Google API keys.
4. **Run the development server:**
   ```bash
   npm run dev
   ```
