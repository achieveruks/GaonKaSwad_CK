# Product Requirements Document (PRD) & Technical Specification
## Gaon Ka Swad — Multi-Outlet Cloud Kitchen Platform

**Document Version:** 1.0.0 (Production Release Specification)  
**System Architecture:** React 19 SPA (Vite) + Express.js API + PostgreSQL / Supabase Realtime DB  
**Target Roles:** Super Admin (Owner), Kitchen Outlet Manager, Customer  
**Geographic Coverage:** Multi-City / Multi-Hub (Bangalore & Bhubaneswar)  
**PDF Document:** Generated at `/PRD_Multi_Outlet_Cloud_Kitchen.pdf` and `/api/prd-pdf`

---

## 1. Executive Summary & Evolutionary History

### 1.1 Brand Concept & Operational Model
**Gaon Ka Swad** is an artisanal, multi-outlet cloud kitchen network specializing in royal dum biryanis, 24-hour slow-cooked gravies (Dal Makhani, Handi Paneer, Dum Gosht), and smoky clay-oven tandoori grills, delivered hot in eco-friendly sealed earthen handis.

Unlike generic single-restaurant delivery sites, Gaon Ka Swad is engineered as an enterprise-grade, distributed multi-tenant platform where each kitchen hub (e.g. Bangalore HSR, Kadabeesanahalli, Indiranagar, Whitefield; Bhubaneswar Kendriya Vihar, Patia, Khandagiri) operates as an autonomous culinary node while sharing unified master catalog data, centralized accounting, cross-hub loyalty (Swad Coins), and dynamic geofenced delivery zones.

### 1.2 Chronological Prompt Evolution & Architectural Milestones
The system was crafted through targeted, sequential user requests:
1. **Artisanal Branding & Customer Storefront:** Established high-fidelity culinary UI, category navigation, sensory dish profiles with aroma notes, culinary heritage storytelling, dish variants (e.g. 500g vs 1kg handis), and add-on selectors.
2. **Multi-Outlet Geofencing & Location Engine:** Introduced 6-digit Indian PIN code auto-resolution against delivery zone arrays, outlet auto-assignment, and the Outlet Switch Safeguard modal to prevent cross-kitchen cart contamination.
3. **Dual-Layer Master Catalog & Atomic Inventory:** Engineered global catalog synchronization with outlet-level overrides. Implemented atomic database portion decrements via PostgreSQL triggers to prevent overselling popular dum handis.
4. **Role-Based Access Control (RBAC):** Segregated administrative boundaries into three clear actors: Super Admin (Owner), Outlet Kitchen Managers (scoped strictly to single outlet hubs), and Phone-first Customers.
5. **Kitchen Display System (KDS) & Order Pipeline:** Designed live manager order board with Web Audio API chime notifications, real-time status transitions (`Received` -> `Confirmed` -> `Preparing in Kitchen` -> `Ready for Pickup / Out for Delivery` -> `Delivered`/`Cancelled`), and reason-based cancellation workflows.
6. **Swad Coins Loyalty Ledger & Dynamic Coupons:** Built a double-entry coin ledger (1 Coin = ₹1) with automated post-delivery reward generation, claim vaults, transaction history, and coupon rules engine with first-order gating.
7. **Verified Purchase Tastings & Reviews:** Implemented a 7-day post-delivery verified purchase review window with star ratings, tasting feedback, and dynamic catalog rating rollups.
8. **Executive Dashboard & Exact Order Reconciliation:** Compacted Block 3 into a 1-line top-right date filter (`All`, `Today`, `7D`, `30D`, custom `dd/mm/yyyy` range) and resolved order count discrepancies by strictly separating Gross Revenue (₹6,737 from 13 active orders) from Cancelled records.

---

## 2. Role 1: Super Admin (Owner) Specification

### 2.1 Executive Dashboard & Revenue Analytics Engine
The Owner Dashboard provides consolidated visibility across all operating cloud kitchen outlets. The system features an ultra-compact "Orders & Revenue" financial nerve center (Block 3) optimized for executive decision-making:

#### 1. Compact One-Liner Date Filter
- Positioned on the top-right of the banner in a single line.
- Features quick presets: **All**, **Today**, **7D**, **30D**.
- Interactive full-click date range picker (`From Date → To Date`) formatted as `dd/mm/yyyy` with instant reset (`✕`).

#### 2. Financial Metrics & Reconciliation Formulas
- **Gross Revenue:**
  $$\text{Gross Revenue} = \sum \text{Delivered Orders} + \sum \text{In-Process Orders}$$
  *Cancelled orders are strictly excluded from gross revenue to prevent phantom reporting.*
- **Order Count Reconciliation:**
  - Displays the active order count beneath the rupee amount (e.g. ₹6,737 across **13 orders**).
  - Explicit reconciliation: 11 Delivered + 2 In Process = 13 Active Orders. The 1 Cancelled order (₹469) is tracked separately.
- **4-Column Metric Breakdown:**
  1. **Revenue:** Total valid gross revenue and count of active orders.
  2. **Delivered:** Total delivered revenue and count.
  3. **In Process:** Active kitchen orders (`Received`, `Confirmed`, `Preparing`, `Ready`, `Out for Delivery`) with order count and value.
  4. **Cancelled:** Cancelled order revenue and count.
- **Average Order Value (AOV):**
  $$\text{AOV} = \frac{\text{Gross Revenue}}{\text{Valid Order Count}}$$
  *E.g., ₹6,737 / 13 orders = ₹518/order. Displayed cleanly in the footer line.*

### 2.2 Master Catalog & Dual-Layer Inventory Architecture
- **Global Catalog Definition:**
  - Item name, Hindi localized name, slug, category, short & deep descriptions.
  - Secret clay-pot cooking method descriptions, aroma profiles, culinary stories.
  - Dietary classifications: Pure Veg, Non-Veg, Jain-Friendly (no onion/garlic/root veg), Spice Level (`Mild`, `Medium`, `Spicy`, `Extra Spicy`), calories, serving size.
  - Variants (e.g. 500g Handi @ ₹349, 1000g Family Handi @ ₹649).
  - Add-ons (e.g. Extra Burani Raita @ ₹40, Boiled Egg @ ₹25, Salan Gravy @ ₹50).
- **Per-Outlet Configuration Overrides (`ProductOutletConfig`):**
  - Stored inside `public.products.outlets` JSONB.
  - Controls per-outlet availability (`inStock`), regional `isFeatured`, regional `isBestseller`, and finite portion inventory (`portionsLeft`).
  - `portionsLeft = null`: Unlimited supply.
  - `portionsLeft = 0`: Sold out.
  - `portionsLeft > 0`: Finite portion count that decrements atomically on order placement.

### 2.3 Multi-Outlet Hubs & Regulatory Governance
- **14-Digit Numeric FSSAI License:** Mandatory regulatory compliance for Indian food safety; validated as strictly numeric 14 digits per outlet.
- **Financial Guardrails per Outlet:**
  - Minimum Order Value (MOV, e.g. ₹200).
  - Free Delivery Threshold (e.g. ₹499).
  - Packaging Fee (e.g. ₹25).
  - Average cooking time (e.g. `25-35 mins`).
- **Dynamic Brand Storytelling:** Custom hero fire lines, trust badges ("4.9 ★ 2.8k+ Google & Zomato"), and dedicated "About Kitchen" narratives per outlet.

### 2.4 Delivery Zones & Dynamic Geofencing
- **PIN Code Array Mapping:** Each delivery zone contains an array of 6-digit postal PIN codes. Entering a PIN code resolves the active delivery zone and binds the session to the target outlet.
- **Variable Zone Pricing:** Configurable delivery fee and SLA transit estimates per zone.

### 2.5 Enterprise Coupon Rules Engine
- **Discount Types:** Percentage discount (with mandatory `maxDiscountAmount` cap) or fixed flat rupee discount.
- **Order Subtotal Restrictions:** Mandatory `minOrderValue` check before applying discounts.
- **Targeting & Gating:** Can be global or restricted to specific outlet IDs; supports `first_order` only gating and `logged_in` user requirements.
- **Usage Limits:** Enforces overall campaign limits and per-customer limits tracked by phone number in `coupon_redemptions`.

### 2.6 Swad Coins Loyalty Program Administration
- **Cashback Rate:** 5% to 10% cashback on eligible subtotal post-delivery, with an enforced maximum cap of 100 coins per order.
- **Admin Credit/Debit:** Ability to credit compensation coins or adjust balances with audit trail descriptions in `swad_coin_transactions`.
- **Batch Dispatch Engine:** Automated cron routines and manual "Generate Rewards" trigger (`SwadCoinDispatch`) scanning delivered orders.

---

## 3. Role 2: Outlet Kitchen Manager Specification

### 3.1 Scoped Access & Kitchen Operations
- **Compartmentalized Scope:** Kitchen managers are bound strictly to their assigned outlet (e.g. `blr-hsr`). They cannot view or modify data from other hubs.

### 3.2 Kitchen Order Display (KDS) & Order Pipeline
- **Web Audio API Chime:** High-priority synthesized audio chime sounds whenever a new order enters the queue in `Received` status.
- **Supabase Realtime Synchronization:** Automatic real-time status updates and order synchronization without page refresh.
- **Sequential Order State Pipeline:**
  1. `Received`: Customer placed order; awaiting kitchen confirmation.
  2. `Confirmed`: Kitchen acknowledged order; sent to prep station.
  3. `Preparing in Kitchen`: Active cooking on dum flames and tandoor.
  4. `Ready for Pickup`: Packed in earthen handis, sealed in carry bags.
  5. `Out for Delivery`: Assigned to delivery partner in transit.
  6. `Delivered`: Completed; unlocks Swad Coin reward claim and review window.
  7. `Cancelled`: Aborted order with mandatory reason logging and automatic rollbacks.

### 3.3 Order Details & Packaging Inspection
- **Itemized Snapshots:** Line items with selected variants, spice levels, and add-ons with historical prices.
- **Cooking & Gate Instructions:** Customer notes (e.g. "Less oil in biryani, ring door bell twice").
- **Eco-Cutlery Indicator:** Prominently flags whether customer opted in or out of disposable cutlery.
- **Immediate vs Scheduled Badges:** Differentiates instant delivery from future delivery time slots.

### 3.4 Cancellation Handling & Atomic Rollbacks
- Reason-based cancellation modal.
- Automatic inventory portion rollback.
- Automatic Swad Coin refund transaction restoring customer balance.

---

## 4. Role 3: Customer Experience & Ordering Logic

### 4.1 Location-First Geocoding & Outlet Safeguard
- **6-Digit PIN Code Auto-Lookup:** Validates Indian postal PIN codes against delivery zones, resolving City, State, and assigned Cloud Kitchen Outlet.
- **Outlet Switching Safeguard:** Prompts user if switching outlets while having cart items from another kitchen.

### 4.2 Artisanal Menu Browsing & Customization
- **Dietary & Lifestyle Filters:** Pure Veg, Non-Veg, Jain-Friendly, Spice Intensity (`Mild`, `Medium`, `Spicy`, `Extra Spicy`).
- **Sensory Dish Profile:** Culinary stories, slow-cooking dum techniques, secret spice masalas, aroma notes, portion weights, and allergen disclosures.
- **Interactive Customization:** Variant selection (Handi 500g vs 1000g) and accompaniment add-ons with dynamic price updates.

### 4.3 Server-Authoritative Cart & Pricing Engine
- **Item Pricing:** `(variant.price || product.price) + sum(addons.price)`
- **Packaging Fee:** Nominally applied per order.
- **Delivery Fee:** Waived (₹0) when `subtotal >= freeDeliveryThreshold`, otherwise standard outlet delivery fee.
- **GST (5%):** Computed as 5% on net food subtotal after discounts.
- **Final Payable Total:**
  $$\text{Total} = \max(0, \text{Subtotal} - \text{Discounts} + \text{PackagingFee} + \text{DeliveryFee} + \text{GST})$$

### 4.4 Checkout & Phone-First Authentication
- **Phone OTP Verification:** 6-digit phone OTP (SMS/WhatsApp gateway compatible, with beta test mode support).
- **Saved Address Book:** Home, Work, Other tags with default selection and landmark precision.
- **Flexible Delivery Modes:** Immediate Dispatch (30-40 min) or Scheduled Delivery (date picker with 1-hour delivery time slots).
- **Payment Versatility:** Cash on Delivery (COD) and Online Payments (UPI, Cards, Netbanking via Razorpay-ready integration).

### 4.5 Swad Coins Rewards Vault & Claim Flow
- Unlocks 5%-10% reward (up to 100 coins) after order is `Delivered`.
- Customers claim pending rewards in their account vault, converting them into spendable coins.
- 1 Swad Coin = ₹1.00 INR direct discount at checkout.
- Expiration window (60-90 days).

### 4.6 Verified Purchase Tasting Reviews
- Reviews strictly restricted to delivered line items from completed orders.
- 7-day review window after `delivered_at` timestamp.
- 1 to 5-star rating with optional 500-character tasting commentary.
- Automatic live re-aggregation of product ratings.

---

## 5. Technical Specifications & Database Schema

### 5.1 Tables Inventory (14 Normalized Tables)
1. `public.outlets` — Physical cloud kitchen hubs, addresses, 14-digit FSSAI IDs, fees, thresholds.
2. `public.delivery_zones` — Geofenced 6-digit postal PIN code arrays linked to outlets with delivery SLAs.
3. `public.products` — Master culinary catalog, descriptions, images, variants, allergens, outlet configs.
4. `public.customers` — Phone-first customer profiles, verification status, welcome discount flags.
5. `public.customer_addresses` — Customer saved addresses (Home, Work, Other) with full address and landmarks.
6. `public.orders` — Normalized orders master with status pipeline, financial breakdowns, and timestamps.
7. `public.order_items` — Line-item snapshots with historical unit prices, selected variants, and add-ons.
8. `public.coupons` — Promotional discount codes, percentage/fixed values, caps, MOVs, and limits.
9. `public.coupon_redemptions` — Historical ledger tracking coupon usage per customer phone and order.
10. `public.swad_coin_rewards` — Post-delivery pending cashback rewards with claim states and expiry dates.
11. `public.swad_coin_transactions` — Double-entry loyalty ledger (`EARN`, `REDEEM`, `REFUND`, `ADMIN_CREDIT`, `ADMIN_DEBIT`).
12. `public.swad_coin_dispatches` — Audit records of automated and manual reward distribution runs.
13. `public.product_reviews` — Verified customer tasting reviews tied to orders, items, and ratings.
14. `public.profiles` — Role-based authorization profiles (`owner`, `outlet_manager`, `customer`) linked to auth.

### 5.2 Key PostgreSQL Triggers
- `trg_generate_order_id`: Before INSERT on `public.orders`. Formats sequential human-readable IDs (`GKSWAD-00001`, `GKSWAD-00002`).
- `trg_decrement_portions_on_order`: After INSERT on `public.orders`. Atomically decrements `portionsLeft` in `public.products.outlets` JSONB.
- `handle_new_user`: After INSERT on `auth.users`. Automatically provisions a `public.profiles` record with role assignment.

---

## 6. Accessing the Generated PRD PDF

The complete, styled multi-page PDF is generated and ready for download:
- **Direct PDF File:** `/public/PRD_Multi_Outlet_Cloud_Kitchen.pdf`
- **Server API Endpoint:** `GET /api/prd-pdf` or `GET /PRD_Multi_Outlet_Cloud_Kitchen.pdf`
- **Root Repository File:** `PRD_Multi_Outlet_Cloud_Kitchen.pdf`
