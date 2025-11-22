Shurplus: MVP Wireframe Specification

Project Context: A distributor-to-community automated marketplace for surplus food.

Design Philosophy: Mobile-first for Donors and Volunteers (on-the-go logistics); Responsive Desktop/Tablet for Food Bank Managers (inventory/admin).

1. Donor Portal (Mobile View)

Target User: Grocery Stores, Restaurants, Farms.

Goal: Minimize friction. "Post a donation in under 30 seconds."

View A: Donor Dashboard (Home)

Concept: Facebook Marketplace style feed, but split between "My Listings" and "Urgent Needs" from banks.

--------------------------------------------------+
|  [=] Menu            DONOR HOME        (Profile) |
+--------------------------------------------------+
|  [ TAB: My Donations ]   [ TAB: Nearby Needs ]   |
+--------------------------------------------------+
|                                                  |
|  NEARBY URGENT REQUESTS (Map Radius: 5km)        |
|                                                  |
|  +--------------------------------------------+  |
|  | [!] URGENT: Canned Beans                   |  |
|  | Req by: St. Mary's Food Bank               |  |
|  | [ Fulfill Request ]                        |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  | [!] URGENT: Baby Formula                   |  |
|  | Req by: North York Harvest                 |  |
|  | [ Fulfill Request ]                        |  |
|  +--------------------------------------------+  |
|                                                  |
|          ( ... Scroll for more ... )             |
|                                                  |
+--------------------------------------------------+
|      [ (+) CREATE NEW DONATION POST (FAB) ]      |
+--------------------------------------------------+
|  Home  |  History  |  Messages  |  Settings      |
+--------------------------------------------------+
View B: Create Donation PostFocus: Fast data entry. The "Photo" is the primary input.+--------------------------------------------------+
|  < Back           NEW DONATION             [Post]|
+--------------------------------------------------+
|                                                  |
|  +--------------------------------------------+  |
|  |                                            |  |
|  |         [ CAMERA ICON / UPLOAD ]           |  |
|  |      Take photo of surplus pallet          |  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  Title: [ e.g., 50 lbs Sourdough Bread      ]    |
|                                                  |
|  Pickup Window:                                  |
|  [ Today ] [ Tomorrow ]  [ 2:00 PM - 4:00 PM ]   |
|                                                  |
|  Weight (Est): [ 50 ] [ kg v]                    |
|                                                  |
|  Description/Notes:                              |
|  [ Pallet is located at loading dock B...   ]    |
|                                                  |
|  Expiry Date: [ MM/DD/YYYY ]                     |
|                                                  |
+--------------------------------------------------+
|            [ POST TO MARKETPLACE ]               |
+--------------------------------------------------+
2. Volunteer Transporter Dashboard (Mobile View)Target User: Drivers, Movers, Gig-economy style volunteers.Goal: Clear routing and simple Check-in/Check-out execution.View C: Route Discovery (AI Recommended)Concept: AI suggests "bundles" of pickups to optimize fuel/time.+--------------------------------------------------+
|  [=]              VOLUNTEER HUB        (Status)  |
+--------------------------------------------------+
|  Current Location: Mississauga, ON               |
|  Available: [ ON ] / OFF                         |
+--------------------------------------------------+
|                                                  |
|  AI RECOMMENDED ROUTES (Best Efficiency)         |
|                                                  |
|  +--------------------------------------------+  |
|  | ROUTE #1 (Est. 45 mins)           [ACCEPT] |  |
|  | ------------------------------------------ |  |
|  | 1. Pickup: Loblaws (Hwy 10)                |  |
|  | 2. Pickup: Local Bakery                    |  |
|  | 3. Dropoff: Mississauga Food Bank          |  |
|  | ------------------------------------------ |  |
|  | Total Weight: 40kg | Impact: 80 Meals      |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  | ROUTE #2 (Est. 1.5 Hours)         [ACCEPT] |  |
|  | ------------------------------------------ |  |
|  | 1. Pickup: Farm Boy                        |  |
|  | 2. Dropoff: Community Shelter              |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
View D: Active Delivery Mode (Logistics)Focus: Big buttons, clear steps. Tracking the "Chain of Custody".+--------------------------------------------------+
|  CURRENT TASK: Pickup 1 of 2                     |
+--------------------------------------------------+
|  [ MAP VIEW VISUALIZATION HERE ]                 |
|                                                  |
|     ( > )  -------->  ( X )                      |
|     You              Target                      |
+--------------------------------------------------+
|  Target: Loblaws (Hwy 10)                        |
|  Contact: Manager John (555-0199)                |
|  Items: 3 Boxes of Apples                        |
+--------------------------------------------------+
|                                                  |
|       [  SWIPE TO ARRIVE AT PICKUP  ]            |
|                                                  |
+--------------------------------------------------+
|  Once Arrived:                                   |
|  [ SCAN QR CODE ] (Validates Pickup)             |
|  [ UPLOAD PHOTO ] (Proof of condition)           |
|                                                  |
|         [ CONFIRM PICKUP COMPLETE ]              |
+--------------------------------------------------+
3. Food Bank / Charity Dashboard (Desktop/Tablet View)Target User: Food Bank Managers, Inventory Coordinators.Goal: High-level oversight, Inventory Velocity, and Deep Product Inspection (Open Food Facts).View E: Main Dashboard (The "Control Tower")Layout: Sidebar Navigation + Widget Grid.+--------------+---------------------------------------------------------------+
| COMMUNITY    |  DASHBOARD OVERVIEW                                           |
| SHURPLUS     |                                                               |
+--------------+---------------------------------------------------------------+
| [ Dashboard] |  +-------------------+  +-------------------+  +------------+ |
|              |  | Total Kg Rescued  |  | Meals Delivered   |  | Active Vol | |
| [ Inventory] |  |    1,240 kg       |  |     3,400         |  |     12     | |
|              |  +-------------------+  +-------------------+  +------------+ |
| [ Incoming ] |                                                               |
|              |  -----------------------------------------------------------  |
| [ Donors   ] |                                                               |
|              |  [ INCOMING SHIPMENTS (Live Tracking) ]                       |
| [ Volunteers]|                                                               |
|              |  | ETA   | Driver | Source      | Contents          | Status  | |
| [ Reports  ] |  |-------|--------|-------------|-------------------|---------| |
|              |  | 10m   | Sarah  | Walmart     | Dairy (Urgent)    | On Route| |
| [ Settings ] |  | 45m   | Mike   | Farm A      | Root Veggies      | PickedUp| |
|              |  | 2h    | TBD    | Bakery      | Bread             | Pending | |
|              |                                                               |
|              |  -----------------------------------------------------------  |
|              |                                                               |
|              |  [ URGENT ALERTS ]                                            |
|              |  [!] 50L Milk expiring in 24h - AI Suggests: distribute ASAP  |
|              |  [!] Low stock warning: Rice / Grains                         |
|              |      [ Button: Create Request Post ]                          |
+--------------+---------------------------------------------------------------+
View F: Inventory Management (Scannable List)Focus: List view with a clear trigger to open detailed modals.+------------------------------------------------------------------------------+
|  INVENTORY MANAGEMENT                                     [ + Add Manual ]   |
+------------------------------------------------------------------------------+
|  AI QUICK ADD ( Webcam / Barcode Scanner )                                   |
|  +------------------------------------------------------------------------+  |
|  |  [ VIDEO PREVIEW: SCANNING... ]                                        |  |
|  |  >> Barcode Detected: 5449000000996                                    |  |
|  |  >> Fetching Open Food Facts Data... Success                           |  |
|  |  [ ADD TO INVENTORY ]                                                  |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
|  CURRENT STOCK                                                               |
|  [ Filter: Expiring Soon ] [ Filter: Allergens ] [ Filter: Nutri-Score ]     |
|                                                                              |
|  | Product Name     | Brand      | Qty | Exp Date   | Nutri-Score | Action | |
|  |------------------|------------|-----|------------|-------------|--------| |
|  | Coca-Cola Orig   | Coca-Cola  | 40  | 2025-12-01 | [ E ] (Red) | [View] | |
|  | W.W. Pasta       | Barilla    | 100 | 2026-01-15 | [ A ] (Grn) | [View] | |
|  | Granola Bars     | Nature Val | 50  | 2024-11-30 | [ C ] (Yel) | [View] | |
+------------------------------------------------------------------------------+
View F-2: Product Inspection Modal (Open Food Facts Data)Focus: Displaying the deep-dive data retrieved via API to help sorting and safety.+------------------------------------------------------------------------------+
|  PRODUCT DETAILS: Barilla Whole Wheat Pasta                         [X] Close|
+------------------------------------------------------------------------------+
|  +---------------------+  +------------------------------------------------+ |
|  |                     |  |  ** General Info ** | |
|  |  [ PRODUCT IMAGE ]  |  |  Barcode: 8076809513753                        | |
|  |  (Retrieved from    |  |  Brand: Barilla                                | |
|  |   Open Food Facts)  |  |  Quantity: 500g                                | |
|  |                     |  |  Categories: Plant-based, Cereals, Durum wheat | |
|  |                     |  +------------------------------------------------+ |
|  +---------------------+                                                     |
|                           +------------------------------------------------+ |
|  ** Health & Environment ** | |
|  +-----------+   +-----------+   +-----------+                             | |
|  | NUTRISCORE|   | NOVA GRP  |   | ECO-SCORE |                             | |
|  |   [ A ]   |   |   [ 1 ]   |   |   [ A ]   |                             | |
|  +-----------+   +-----------+   +-----------+                             | |
|                                                                            | |
|  ** Ingredients & Allergens ** (Critical for Safety)                       | |
|  > Ingredients: Whole durum wheat semolina, water.                         | |
|  > Allergens: [!] GLUTEN                                                   | |
|  > Traces: Soy                                                             | |
|                                                                            | |
|  ** Nutrient Levels ** | |
|  - Fat: Low (1.5g)                                                         | |
|  - Sugars: Low (3.5g)                                                      | |
|  - Salt: Low (0.01g)                                                       | |
|                                                                            | |
|  +------------------------------------------------------------------------+  |
|  |  INTERNAL NOTES:                                                       |  |
|  |  [ Location: Shelf B-12 ]   [ Status: Available ]                      |  |
|  |  [ UPDATE STOCK ]           [ MARK AS DISTRIBUTED ]                    |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
View G: Volunteer ManagementFocus: Tracking hours and roles as per MVP requirements.+------------------------------------------------------------------------------+
|  VOLUNTEER TRACKING                                                          |
+------------------------------------------------------------------------------+
|  +-----------------------+   +---------------------------------------------+ |
|  | Quick Actions         |   | VOLUNTEER ROSTER                            | |
|  | [ Approve Hours ]     |   |                                             | |
|  | [ Schedule Shift ]    |   | Name      | Role    | Hours (Mo) | Status   | |
|  | [ Send Blast Msg ]    |   |-----------|---------|------------|----------| |
|  |                       |   | Eric W.   | Driver  | 20.5       | Active   | |
|  +-----------------------+   | Sarah J.  | Sorter  | 5.0        | Offline  | |
|                              | Mike R.   | Driver  | 12.0       | On Job   | |
|                              +---------------------------------------------+ |
+------------------------------------------------------------------------------+
|  RECENT LOGS                                                                 |
|  > Eric W. completed delivery #4492 (Loblaws -> Hub) - 45 mins               |
|  > Sarah J. clocked out (Sorting) - 4 hours                                  |
+------------------------------------------------------------------------------+
