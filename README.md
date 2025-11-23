# Shurplus

**Building a complete distributor-to-community automated marketplace streamlining the logistics and distribution of surplus food.**

## The Team
- **Ishaan Dhiman**
- **Sai Amartya Balamurugan Lakshmipraba**
- **Aamirali Tinwala**
- **Dhairya Shah**
- **Dhanika Botejue**
- **Skyler Yoo**


---

## Pitch
~40% of food in North America is wasted, yet Canadian food banks today are under unprecedented strain. HungerCount 2025 reports nearly 2.2 million visits in a single month (double the level of six years earlier). This surge means local charities must move far more food and serve even more people, with only volunteer labor and limited budgets. This creates logistical complexities at every step: collecting and cataloguing donations, storing them, and distributing the food to clients. Meanwhile, local food bank logistics are still operating inefficiently with old technology and intensive manual processes.

**Several logistics issues exist:**
1. **Inventory Chaos:** Volunteers at a Canadian food bank organize donated groceries. Tracking thousands of pounds of unsorted goods manually is a logistical headache. Food banks have no standardized SKUs, and many banks still track hundreds of items on Excel or paper.
2. **Coordination Bottlenecks:** Organizing pickups from hundreds of donors (grocery stores, manufacturers, farms, house-to-house drives) is extremely labor-intensive.
3. **Volunteer Management:** Local banks rely almost entirely on volunteers. Scheduling shifts and recording hours are often done by hand, wasting time and making recruitment difficult.

---

## The Solution
The solution consists of two parts:

### 1. Marketplace Aspect
Connects all stakeholders similarly to Facebook Marketplace:
- **Distributors** post food donation offers.
- **Volunteer Transporters** view nearby distributions to pickup and drop.
- **Food Banks** manage inventory, view recommended meals, request urgent items, and view incoming donations.

### 2. Automation Systems
Three agents work together to amplify the marketplace:
- **Inventory Agent**
- **Networking Agent**
- **Management Agent**

---

## Problem at Hand
Logistics is the biggest obstacle faced by food banks and charities:
- **Route Planning**
- **Inventory Management** (logging food items & deciding what to give away)

### Stakeholders
- **Distributors/Wholesalers/Corporations:** Entities with "excess food" (ugly to sell or close to expiry).
- **Foodbanks/Charities:** The recipients.
- **Volunteer Moving Fleets:** E.g., "Move For Hunger" mobilizes volunteer fleets to collect bulk donations.

---

## Proposed Solution & Features

### Marketplace Aspect
- **Distributors:** Post food donation offers (photo, weight, expiry, pickup window).
- **Volunteer Transporters:** View nearby distributions for pickup/drop.
- **Food Banks:** Manage inventory, view AI-recommended meals, flag urgent items (visible to distributors), view incoming donations.

### Automation Systems
1. **Inventory Agent:**
   - Vision system or barcode scanner to add products (OpenFoodFacts API).
   - Suggest meals to give away based on expiry date.
2. **Networking Agent / Route Planning:**
   - Connects stakeholders (volunteer fleets).
   - Coordinates logistics using **Google Maps API**.
3. **Management Agent:**
   - Helps manage volunteers and schedules.

---

## Concrete Feature List (MVP)

### Donor Portal
_Minimize the hassle of donation_
- **Create Donation Posts:** Pickup window, Title, Description, Photo.
- **View Requests:** See flagged/requested items from nearby food banks.

### Volunteer Transporter Dashboard
- **View Donation Posts:** Access available pickups.
- **AI-Agent Recommended Routes:**
  - Accepts pickup routes based on time windows.
  - **Context:** Uses existing donation posts, food bank profiles, and volunteer profiles.
  - **Tool:** Google Maps API for route testing and optimization.
  - **Output:** Optimized route map ending at a nearby food bank.
- **Check-in/out Logs:** Track each pickup and delivery.

### Food Bank/Charity Dashboard
**Automated Inventory Management Interface:**
- **Intuitive Inventory View:** Easy-add via barcode scanning (OpenFoodFacts API) or AI image detection.
- **AI Recommended Meal Plans:** Suggestions to distribute/share based on inventory expiry.
- **Flag Urgent/Expiring Goods:** Request management.
- **Refactored Flagged Items Logic:** Instead of accepted requests being immediately sent to incoming shipments, the system auto-creates a donation post with the request info, ensuring the agent knows it MUST be shipped to the requesting food bank.
- **Routing Details:** Manage incoming shipments based on volunteer transport logs.
- **Quick Monitoring:** Track total kg rescued, meals delivered, etc.

### Volunteer Tracking & Management
- **Volunteer Profiles:** Name, Contact info, Role/Team (sorting, warehouse, admin), Availability, Verification status.
- **Logs Dashboard:** Clean table showing Volunteer name, Total hours, Tasks completed, Last active date.
- **Reward Badges:** Acknowledge accomplishments based on hours and effort.
- **Time Tracking:** Log start/end times for volunteering sessions.

---

## Difficulties Faced & Lessons Learned

Throughout the development of SharingSurplus, we encountered several technical and logistical challenges:

- **Version Control & Collaboration:** Managing multiple branches and resolving complex merge conflicts was a significant hurdle as our team worked on different features simultaneously.
- **AI Vision Integration:** Implementing the AI Vision Scanner proved difficult initially due to SDK compatibility issues. Switching to the correct SDK and recalibrating the image processing pipeline required significant effort.
- **Complex Firestore Security Rules:** Designing secure yet flexible Firestore rules to allow appropriate communication and data sharing between three distinct user roles (Food Banks, Donors, Volunteers) was a major architectural challenge.
- **AI Calibration for Distribution:** Calibrating the AI to accurately estimate storage needs and distribution logistics introduced several setbacks that required iterative testing and refinement.
- **Smart Route Engineering:** Developing the Smart Route Generation Agent involved complex geolocation calculations and extensive "context engineering" to ensure the AI understood real-world constraints like traffic and vehicle capacity.
- **Multi-User Architecture:** Integrating the tech stack to support three distinct user flows seamlessly within a single application required careful state management and routing logic.
- **Agent Tooling:** Gathering the necessary context and defining clear tool definitions for the Food Bank AI Agent to function autonomously was a complex task requiring precise prompt engineering.

---

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend/Auth:** Firebase (Firestore, Auth)
- **AI:** Google GenAI (Gemini)
- **Maps:** Google Maps API
- **Data:** Open Food Facts API

---

## Getting Started

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
