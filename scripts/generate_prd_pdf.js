import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Helper to create the styled PDF
function buildPRD() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
  });

  const publicPath = path.join(process.cwd(), 'public', 'PRD_Multi_Outlet_Cloud_Kitchen.pdf');
  const rootPath = path.join(process.cwd(), 'PRD_Multi_Outlet_Cloud_Kitchen.pdf');

  const streamPublic = fs.createWriteStream(publicPath);
  const streamRoot = fs.createWriteStream(rootPath);

  doc.pipe(streamPublic);
  doc.pipe(streamRoot);

  const colors = {
    primary: '#B45309', // Warm amber-700
    primaryDark: '#78350F', // Warm amber-900
    secondary: '#1E293B', // Slate 800
    muted: '#64748B', // Slate 500
    accent: '#059669', // Emerald 600
    danger: '#DC2626', // Red 600
    bgLight: '#F8FAFC', // Slate 50
    border: '#E2E8F0', // Slate 200
    cardBg: '#FFFBEB', // Amber 50
  };

  // Helper functions
  function addHeader(title, subtitle) {
    doc.fillColor(colors.primaryDark).fontSize(22).font('Helvetica-Bold').text(title);
    if (subtitle) {
      doc.moveDown(0.3);
      doc.fillColor(colors.muted).fontSize(10).font('Helvetica').text(subtitle);
    }
    doc.moveDown(0.8);
    // Underline divider
    doc.strokeColor(colors.border).lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(0.8);
  }

  function addSectionTitle(title, tag) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.6);
    doc.fillColor(colors.primaryDark).fontSize(14).font('Helvetica-Bold').text(title);
    if (tag) {
      doc.fontSize(8).fillColor(colors.primary).font('Helvetica-Bold').text(tag.toUpperCase(), { align: 'right' });
    }
    doc.moveDown(0.3);
    doc.strokeColor(colors.primary).lineWidth(1.5)
      .moveTo(50, doc.y)
      .lineTo(150, doc.y)
      .stroke();
    doc.moveDown(0.6);
  }

  function addSubSection(title) {
    if (doc.y > 700) doc.addPage();
    doc.moveDown(0.4);
    doc.fillColor(colors.secondary).fontSize(11).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
  }

  function addParagraph(text) {
    if (doc.y > 720) doc.addPage();
    doc.fillColor(colors.secondary).fontSize(9.5).font('Helvetica').text(text, {
      align: 'justify',
      lineGap: 3,
    });
    doc.moveDown(0.4);
  }

  function addBullet(title, desc) {
    if (doc.y > 720) doc.addPage();
    doc.fillColor(colors.primary).fontSize(9.5).font('Helvetica-Bold').text('• ', { continued: true });
    doc.fillColor(colors.secondary).font('Helvetica-Bold').text(`${title}: `, { continued: true });
    doc.fillColor(colors.secondary).font('Helvetica').text(desc, {
      align: 'justify',
      lineGap: 2,
    });
    doc.moveDown(0.3);
  }

  function addCalloutBox(title, lines, boxColor = colors.cardBg, borderColor = colors.primary) {
    if (doc.y > 660) doc.addPage();
    const startY = doc.y;
    const boxWidth = 495;
    const padding = 10;
    
    // Estimate height
    const totalLines = lines.length + 1;
    const estimatedHeight = totalLines * 15 + padding * 2;

    doc.rect(50, startY, boxWidth, estimatedHeight).fillAndStroke(boxColor, borderColor);
    doc.fillColor(colors.primaryDark).fontSize(10).font('Helvetica-Bold').text(title, 60, startY + padding);
    
    let curY = startY + padding + 16;
    lines.forEach((line) => {
      doc.fillColor(colors.secondary).fontSize(8.5).font('Helvetica').text(line, 60, curY, { width: 475 });
      curY += 14;
    });

    doc.y = startY + estimatedHeight + 12;
  }

  // ==========================================
  // PAGE 1: TITLE & COVER SHEET
  // ==========================================
  doc.rect(40, 40, 515, 762).strokeColor(colors.primary).lineWidth(2).stroke();
  doc.rect(45, 45, 505, 752).strokeColor(colors.border).lineWidth(1).stroke();

  doc.moveDown(4);
  doc.fillColor(colors.primary).fontSize(11).font('Helvetica-Bold').text('SYSTEM ARCHITECTURE & PRODUCT SPECIFICATION', { align: 'center', characterSpacing: 1.5 });
  doc.moveDown(1);
  doc.fillColor(colors.primaryDark).fontSize(28).font('Helvetica-Bold').text('Gaon Ka Swad', { align: 'center' });
  doc.fillColor(colors.secondary).fontSize(16).font('Helvetica').text('Multi-Outlet Cloud Kitchen Platform', { align: 'center' });
  
  doc.moveDown(0.8);
  doc.strokeColor(colors.primary).lineWidth(2).moveTo(180, doc.y).lineTo(415, doc.y).stroke();
  doc.moveDown(1.5);

  doc.fillColor(colors.muted).fontSize(10).font('Helvetica-Bold').text('Comprehensive Product Requirements Document (PRD)', { align: 'center' });
  doc.fontSize(9).font('Helvetica').text('End-to-End Business Logic, System Workflows, Role Deep-Dives & Data Schemas', { align: 'center' });

  doc.moveDown(4);

  // Metadata Card on Cover
  const coverMetaY = doc.y;
  doc.rect(100, coverMetaY, 395, 175).fillAndStroke('#F8FAFC', colors.border);
  doc.fillColor(colors.primaryDark).fontSize(11).font('Helvetica-Bold').text('DOCUMENT CONTROL & SYSTEM DETAILS', 120, coverMetaY + 15);
  
  const metaItems = [
    ['Document Version', '1.0.0 (Production Release Specification)'],
    ['Target Stakeholders', 'Admin (Owner), Kitchen Outlet Managers, Customers'],
    ['Core System Engine', 'React 19 SPA (Vite) + Express.js + Supabase Realtime DB'],
    ['Cloud Infrastructure', 'PostgreSQL / Supabase + Express Middleware API'],
    ['Kitchen Hubs Covered', 'Bangalore (HSR, Kadabeesanahalli, etc.) & Bhubaneswar'],
    ['Prepared For', 'Cloud Kitchen Executive & Engineering Leadership'],
    ['Effective Date', 'October 2026'],
  ];

  let metaY = coverMetaY + 35;
  metaItems.forEach(([k, v]) => {
    doc.fillColor(colors.secondary).fontSize(8.5).font('Helvetica-Bold').text(k + ':', 120, metaY);
    doc.fillColor(colors.secondary).fontSize(8.5).font('Helvetica').text(v, 230, metaY);
    metaY += 18;
  });

  doc.y = coverMetaY + 200;
  doc.fillColor(colors.muted).fontSize(8).font('Helvetica').text('Confidential • Internal Enterprise Cloud Kitchen Specification', { align: 'center' });

  // ==========================================
  // PAGE 2: EXECUTIVE SUMMARY & EVOLUTION HISTORY
  // ==========================================
  doc.addPage();
  addHeader('1. Executive Summary & Evolutionary Journey', 'Architectural vision and prompt-driven evolutionary synthesis');

  addSectionTitle('1.1 Platform Concept & Product Vision');
  addParagraph('Gaon Ka Swad is a modern, artisanal multi-outlet cloud kitchen operating across multiple metropolitan cities (initially Bangalore and Bhubaneswar). The brand specializes in royal dum biryanis, 24-hour slow-cooked gravies, smoky clay-oven tandoori grills, and authentic regional Indian dishes delivered in sealed eco-handis. Unlike standard single-kitchen food-delivery apps, Gaon Ka Swad is engineered as an enterprise-grade, distributed multi-tenant platform where each outlet functions as an autonomous culinary node while sharing unified master catalog data, centralized accounting, cross-hub loyalty (Swad Coins), and dynamic geofenced delivery zones.');

  addSectionTitle('1.2 Prompt-Driven Evolutionary Sprints');
  addParagraph('The platform was constructed iteratively through sequential, high-precision prompts. The system architecture evolved through the following distinct milestones:');

  addBullet('Sprint 1 - Artisanal Identity & Customer Storefront', 'Established high-fidelity culinary UI, category navigation, dish cards with aroma notes, culinary storytelling, dish variants (e.g. 500g vs 1kg handis), and add-on selectors.');
  addBullet('Sprint 2 - Multi-Outlet Geofencing & Location Engine', 'Introduced 6-digit Indian PIN code auto-resolution against delivery zone arrays, outlet auto-assignment, and the Outlet Switch Safeguard modal to prevent cross-kitchen cart contamination.');
  addBullet('Sprint 3 - Dual-Layer Master Catalog & Atomic Inventory', 'Engineered global catalog synchronization with outlet-level overrides. Implemented atomic database portion decrements via PostgreSQL triggers to prevent overselling popular dum handis.');
  addBullet('Sprint 4 - Role-Based Access Control (RBAC)', 'Segregated administrative boundaries into three clear actors: Super Admin (Owner), Outlet Kitchen Managers (scoped strictly to single outlet hubs), and Phone-first Customers.');
  addBullet('Sprint 5 - Kitchen Display System (KDS) & Order Pipeline', 'Designed live manager order board with Web Audio API chime notifications, real-time status transitions (Received -> Confirmed -> Preparing -> Ready -> Delivered/Cancelled), and reason-based cancellation workflows.');
  addBullet('Sprint 6 - Swad Coins Loyalty Ledger & Dynamic Coupons', 'Built a double-entry coin ledger (1 Coin = ₹1) with automated post-delivery reward generation, claim vaults, transaction history, and coupon rules engine with first-order gating.');
  addBullet('Sprint 7 - Verified Purchase Tastings & Reviews', 'Implemented a 7-day post-delivery verified purchase review window with star ratings, tasting feedback, and dynamic catalog rating rollups.');
  addBullet('Sprint 8 - Executive Dashboard & Exact Order Reconciliation', 'Compacted Block 3 into a 1-line top-right date filter (All, Today, 7D, 30D, custom dd/mm/yyyy range) and resolved order count discrepancies by strictly separating Gross Revenue (₹6,737 from 13 active orders) from Cancelled records.');

  // ==========================================
  // PAGE 3: ROLE 1 - SUPER ADMIN / OWNER
  // ==========================================
  doc.addPage();
  addHeader('2. Role Specification: Super Admin (Owner)', 'Centralized operational, financial, catalog, and multi-hub governance');

  addSectionTitle('2.1 Executive Dashboard & Revenue Analytics Engine');
  addParagraph('The Owner Dashboard provides consolidated visibility across all operating cloud kitchen outlets. The system features an ultra-compact "Orders & Revenue" financial nerve center (Block 3) optimized for executive decision-making:');

  addBullet('Compact One-Liner Date Filter', 'Positioned at the top-right of the banner. Features quick presets: All, Today, 7D, 30D, alongside interactive full-click "From Date -> To Date" picker supporting dd/mm/yyyy formatting and instant reset.');
  addBullet('Gross Revenue Metric', 'Calculates valid revenue from active orders: Gross Revenue = Sum(Delivered Orders) + Sum(In-Process Orders). Excludes cancelled orders to ensure zero phantom earnings.');
  addBullet('Exact Order Count Reconciliation', 'Displays the precise active order count beneath the rupee amount (e.g. ₹6,737 across 13 active orders), reconciling 11 Delivered + 2 In-Process orders while accurately categorizing the 1 Cancelled order separately.');
  addBullet('4-Column Breakdown', '1. Revenue (Total valid revenue & count), 2. Delivered (Completed revenue & count), 3. In Process (Active preparation/transit & count), 4. Cancelled (Lost revenue & cancellation count).');
  addBullet('Average Order Value (AOV)', 'Prominently presented in the card footer: AOV = Gross Revenue / Valid Orders (e.g. ₹518/order). Fully responsive across mobile, tablet, and desktop.');

  addCalloutBox('FINANCIAL CALCULATION FORMULAS', [
    '• Valid Orders = Count(Delivered) + Count(In-Process) [Excludes Cancelled]',
    '• Gross Revenue = Subtotal + Packaging + DeliveryFee + Tax - Discounts (for Valid Orders)',
    '• Net Realized Revenue = Delivered Revenue only',
    '• Average Order Value (AOV) = Gross Revenue / Valid Orders',
  ]);

  addSectionTitle('2.2 Master Catalog & Outlet Override Architecture');
  addParagraph('The catalog operates on a dual-layer data architecture: a central master product definition and an outlet-specific JSONB configuration array (ProductOutletConfig). The Owner has sole authority to:');
  addBullet('Global Item Definition', 'Configure product titles, Hindi names, slugs, category assignments, detailed culinary descriptions, secret clay-pot cooking methods, aroma profiles, veg/non-veg tags, and Jain-friendly flags.');
  addBullet('Portion & Inventory Controls', 'Set per-outlet portion limits: null (unlimited portions), 0 (marked sold out), or positive integers (finite daily dum portions that atomically decrement as orders are confirmed).');
  addBullet('Featured & Bestseller Toggles', 'Highlight specific regional specialties per outlet independently (e.g., Dum Biryani featured in Bangalore HSR while Dal Makhani featured in Bhubaneswar).');
  addBullet('Variants & Add-on Bundles', 'Define variant pricing (e.g. 500g Handi @ ₹349 vs 1kg Family Pack @ ₹649) and optional add-ons (extra burani raita @ ₹40, boiled egg @ ₹25, salan gravy @ ₹50).');

  addSectionTitle('2.3 Multi-Outlet Hubs & Regulatory Governance');
  addBullet('14-Digit Numeric FSSAI License', 'Mandatory regulatory compliance for Indian food safety; validated as strictly numeric 14 digits per outlet.');
  addBullet('Financial Guardrails', 'Define per-outlet Minimum Order Value (MOV, e.g. ₹200), Free Delivery Threshold (e.g. ₹499), and standard Packaging Fee (e.g. ₹25).');
  addBullet('Custom Brand Storytelling', 'Each outlet possesses custom hero fire-lines, trust badge ratings ("4.9 ★ 2.8k+ Google & Zomato"), and dedicated "About Kitchen" narratives.');

  // ==========================================
  // PAGE 4: ADMIN CONTROLS (ZONES, COUPONS, SWAD COINS)
  // ==========================================
  doc.addPage();
  addHeader('2. Super Admin: Promotions, Zones & Loyalty', 'Geofencing, coupon creation rules, and Swad Coins ledger administration');

  addSectionTitle('2.4 Delivery Zones & Dynamic Geofencing');
  addParagraph('To guarantee food reaches customers at peak temperature within 30-40 minutes, each outlet is mapped to multiple delivery zones:');
  addBullet('PIN Code Array Mapping', 'Each delivery zone encapsulates a dedicated array of 6-digit postal PIN codes. When a customer enters their PIN, the server matches the active zone and binds the session to the target outlet.');
  addBullet('Custom Zone Pricing', 'Allows setting variable delivery fees (e.g. ₹40 for core 3km zone, ₹60 for outer radius) and estimated delivery transit times.');

  addSectionTitle('2.5 Enterprise Coupon Rules Engine');
  addParagraph('The platform includes a robust promotional discounting system managed exclusively by the Super Admin:');
  addBullet('Discount Mechanisms', 'Supports percentage discounts (with mandatory maxDiscountAmount caps, e.g. 20% up to ₹100) or fixed flat rupee discounts.');
  addBullet('Minimum Order Value (MOV)', 'Coupons strictly enforce basket subtotal thresholds before applying discounts.');
  addBullet('Audience & Scope Restrictions', 'Can be targeted globally across all outlets or restricted to designated outlets. Supports "First Order Only" gating or "Logged-in Only" restrictions.');
  addBullet('Usage Limiting', 'Enforces both total campaign usage caps and per-customer usage limits tracked by customer phone number in the coupon_redemptions table.');

  addSectionTitle('2.6 Swad Coins Loyalty Program Administration');
  addParagraph('Swad Coins represent a proprietary digital cashback and customer retention engine (1 Swad Coin = ₹1.00 INR):');
  addBullet('Reward Percentage & Caps', 'Standard reward rule: 5% to 10% cashback on eligible subtotal post-delivery, with an enforced maximum cap of 100 coins per order.');
  addBullet('Admin Credit / Debit Controls', 'Admin can manually credit compensation coins or adjust balances with mandatory audit trail descriptions stored in swad_coin_transactions.');
  addBullet('Batch Dispatch Engine', 'Includes automated cron routines and manual "Generate Rewards" trigger (SwadCoinDispatch) scanning delivered orders and issuing claimable reward records.');

  addCalloutBox('SWAD COIN TRANSACTION TYPES & AUDIT TRAIL', [
    '• EARN: Credited to customer upon claiming delivered order reward.',
    '• REDEEM: Deducted at checkout when customer spends coins (1 Coin = ₹1).',
    '• REFUND: Automatically returned to customer if order is cancelled.',
    '• ADMIN_CREDIT: Manual goodwill/support credit by Super Admin.',
    '• ADMIN_DEBIT: Manual correction/adjustment by Super Admin.',
  ]);

  // ==========================================
  // PAGE 5: ROLE 2 - OUTLET KITCHEN MANAGER
  // ==========================================
  doc.addPage();
  addHeader('3. Role Specification: Outlet Kitchen Manager', 'Kitchen Display System (KDS), order fulfillment, and local stock control');

  addSectionTitle('3.1 Scoped Access & Kitchen Operations');
  addParagraph('Outlet Kitchen Managers are frontline operational leaders. Their access is strictly compartmentalized to their assigned physical cloud kitchen (e.g., manager.hsr@gaonkaswad.in is locked exclusively to blr-hsr). They do not see financials, coupons, or catalog pricing of other outlets.');

  addSectionTitle('3.2 Kitchen Order Display (KDS) & Order Pipeline');
  addParagraph('The KDS provides real-time order queue management designed for fast-paced commercial kitchens:');
  addBullet('Live Audio Chime Alert', 'Synthesized Web Audio API bell chimes immediately when a new order enters the "Received" state, alerting chefs without requiring screen gazing.');
  addBullet('Real-Time Supabase Synchronization', 'Subscribed to PostgreSQL Realtime events. New orders, status changes, and cancellations update instantly on screen without browser refreshes.');
  addBullet('Strict Sequential Status Pipeline', 'Orders advance through standardized operational phases:');

  const pipeline = [
    '1. Received: Order placed by customer, awaiting kitchen confirmation.',
    '2. Confirmed: Kitchen acknowledges order; ticket printed/sent to cook station.',
    '3. Preparing in Kitchen: Handis on dum flame, tandoor roasting active.',
    '4. Ready for Pickup: Sealed in eco-handi bags, awaiting delivery partner pickup.',
    '5. Out for Delivery: Rider assigned and in transit to customer doorstep.',
    '6. Delivered: Handed over to customer; triggers Swad Coin reward generation.',
    '7. Cancelled: Aborted order with mandatory reason logging and automatic rollbacks.',
  ];
  addCalloutBox('KITCHEN ORDER STATUS STATE MACHINE', pipeline, '#EFF6FF', '#3B82F6');

  addSectionTitle('3.3 Order Inspection & Packaging Details');
  addBullet('Itemized Ticket Snapshots', 'Displays line items with selected variants (e.g. 1kg Handi), spice levels (Extra Spicy), and selected add-ons (Extra Salan). Prices are preserved as historical snapshots.');
  addBullet('Cooking & Gate Instructions', 'Displays customer notes (e.g., "Less oil in biryani, ring door bell twice").');
  addBullet('Eco-Cutlery Indicator', 'Prominently flags whether the customer requested wooden disposable cutlery or opted out for zero waste.');
  addBullet('Delivery Type & Scheduling', 'Differentiates "Immediate Delivery" from "Scheduled Delivery" slots with visual color-coded badges to prevent premature cooking.');

  addSectionTitle('3.4 Cancellation Handling & Atomic Rollbacks');
  addParagraph('When an order must be cancelled (e.g. customer request or out-of-stock emergency), the Manager utilizes the Cancel Order modal with predefined reasons. The system immediately executes:');
  addBullet('Inventory Reversal', 'Restores portion counts back to the product outlets config.');
  addBullet('Loyalty Coin Refund', 'If the customer redeemed Swad Coins, an automated REFUND transaction is created, restoring the customer balance.');
  addBullet('Audit Logging', 'Records the cancellation timestamp and reason permanently in public.orders.');

  // ==========================================
  // PAGE 6: ROLE 3 - CUSTOMER JOURNEY
  // ==========================================
  doc.addPage();
  addHeader('4. Role Specification: Customer Experience', 'Location-first onboarding, artisanal menu browsing, checkout & post-order delight');

  addSectionTitle('4.1 Location-First Geocoding & Outlet Safeguard');
  addParagraph('To eliminate food delivery disappointment, the customer experience begins with location detection:');
  addBullet('6-Digit PIN Code Auto-Lookup', 'Validates Indian postal PIN codes against all outlet delivery zones. Automatically resolves City, State, Area, and assigned Cloud Kitchen Outlet.');
  addBullet('Outlet Switching Safeguard', 'If a customer changes their delivery PIN while holding items from an outlet in their cart, the system intercepts with a modal warning: "Your cart contains items from a different kitchen. Would you like to clear cart and switch, or keep current outlet?".');

  addSectionTitle('4.2 Artisanal Menu Browsing & Customization');
  addParagraph('The storefront showcases culinary heritage with deep sensory details:');
  addBullet('Dietary & Lifestyle Filters', 'One-click toggles for Pure Veg, Non-Veg, Jain-Friendly (prepared without root vegetables/onions/garlic), and Spice Intensity (Mild, Medium, Spicy, Extra Spicy).');
  addBullet('Sensory Dish Profile', 'Every dish details culinary heritage stories, slow-cooking dum techniques, secret spice masalas, aroma notes, portion weights, and allergen disclosures.');
  addBullet('Interactive Customization', 'Modal selector for variant sizing (Handi 500g vs 1000g) and accompaniment add-ons with dynamic price updates.');

  addSectionTitle('4.3 Server-Authoritative Cart & Pricing Engine');
  addParagraph('All financial calculations are computed server-side to prevent client tampering:');
  addBullet('Cart Subtotal', 'Sum of all selected line items (base variant + add-ons) * quantity.');
  addBullet('Packaging Fee', 'Nominal per-order fee for food-grade earthen handis and tamper-proof packaging.');
  addBullet('Dynamic Delivery Fee', 'Standard zone fee applied; automatically waived (₹0) when subtotal meets or exceeds the outlet Free Delivery Threshold (e.g. ₹499).');
  addBullet('5% Statutory Restaurant GST', 'Accurately computed as 5% on the net food subtotal after applicable discounts.');
  addBullet('Final Payable Total', 'Total = Max(0, Subtotal - Discounts + PackagingFee + DeliveryFee + GST).');

  addSectionTitle('4.4 Checkout & Phone-First Authentication');
  addBullet('Phone OTP Verification', 'Frictionless authentication via 6-digit phone OTP (SMS/WhatsApp gateway integrated, with beta test mode support for rapid onboarding).');
  addBullet('Saved Address Book', 'Supports multiple delivery addresses labeled as Home, Work, or Other, with default selection and landmark precision.');
  addBullet('Flexible Delivery Modes', 'Supports Immediate Dispatch (30-40 min) or Scheduled Delivery (date picker with 1-hour delivery time slots).');
  addBullet('Payment Versatility', 'Supports Cash on Delivery (COD) and Online Payments (UPI, Cards, Netbanking via Razorpay-ready integration).');

  // ==========================================
  // PAGE 7: POST-DELIVERY LOYALTY & REVIEWS
  // ==========================================
  doc.addPage();
  addHeader('4. Customer Loyalty, Vault & Verified Reviews', 'Retention loops, reward claiming, and authenticated customer reviews');

  addSectionTitle('4.5 Swad Coins Rewards Vault & Claim Flow');
  addParagraph('Unlike passive loyalty points, Swad Coins create an engaging, active claim loop that drives repeated app visits:');
  addBullet('Pending Reward Generation', 'When an order status changes to "Delivered", the system calculates a 5%-10% reward (up to 100 coins) and creates a PENDING reward record.');
  addBullet('Customer Claim Vault', 'The customer navigates to their Swad Coins Vault in their profile and clicks "Claim Reward". This transfers the coins into their live balance and records an EARN transaction.');
  addBullet('Redemption at Checkout', '1 Swad Coin = ₹1.00 INR. Customers can toggle "Redeem Swad Coins" at checkout, deducting the exact amount from their total bill.');
  addBullet('Expiration Window', 'Unclaimed rewards feature a 60-90 day expiration window, incentivizing prompt return engagement.');

  addSectionTitle('4.6 Verified Purchase Tasting Reviews');
  addParagraph('To ensure 100% review authenticity and protect brand reputation:');
  addBullet('Verified Purchase Gating', 'Reviews can strictly only be submitted for dishes actually delivered in a completed order. No guest or pre-purchase reviews are allowed.');
  addBullet('7-Day Review Window', 'Customers can review items up to 7 days after the delivered_at timestamp. Once the deadline passes, review eligibility expires.');
  addBullet('Granular Star Ratings & Comments', '1 to 5-star rating with optional 500-character tasting commentary.');
  addBullet('Automatic Catalog Rating Rollup', 'Submitted ratings immediately update the product average rating and review counts on the public storefront.');

  addCalloutBox('END-TO-END VERIFIED REVIEW LIFECYCLE', [
    '1. Order reaches "Delivered" status -> delivered_at timestamp recorded.',
    '2. Endpoint /api/reviews/eligibility verifies customer phone & 7-day window.',
    '3. Customer rates each dish individually in Order History.',
    '4. Reviews published to public.product_reviews; product rating re-indexed.',
  ]);

  // ==========================================
  // PAGE 8: DATA ARCHITECTURE & SECURITY
  // ==========================================
  doc.addPage();
  addHeader('5. Database Architecture & Technical Specs', 'PostgreSQL schema, triggers, and Row Level Security (RLS)');

  addSectionTitle('5.1 Master Table Inventory');
  addParagraph('The Supabase PostgreSQL database comprises 14 normalized, highly indexed tables:');

  const tables = [
    ['public.outlets', 'Physical cloud kitchen hubs, addresses, 14-digit FSSAI IDs, fees, thresholds.'],
    ['public.delivery_zones', 'Geofenced 6-digit postal PIN code arrays linked to outlets with delivery SLAs.'],
    ['public.products', 'Master culinary catalog, descriptions, images, variants, allergens, outlet configs.'],
    ['public.customers', 'Phone-first customer profiles, verification status, welcome discount flags.'],
    ['public.customer_addresses', 'Customer saved addresses (Home, Work, Other) with full address and landmarks.'],
    ['public.orders', 'Normalized orders master with status pipeline, financial breakdowns, and timestamps.'],
    ['public.order_items', 'Line-item snapshots with historical unit prices, selected variants, and add-ons.'],
    ['public.coupons', 'Promotional discount codes, percentage/fixed values, caps, MOVs, and limits.'],
    ['public.coupon_redemptions', 'Historical ledger tracking coupon usage per customer phone and order.'],
    ['public.swad_coin_rewards', 'Post-delivery pending cashback rewards with claim states and expiry dates.'],
    ['public.swad_coin_transactions', 'Double-entry loyalty ledger (EARN, REDEEM, REFUND, ADMIN_CREDIT, ADMIN_DEBIT).'],
    ['public.swad_coin_dispatches', 'Audit records of automated and manual reward distribution runs.'],
    ['public.product_reviews', 'Verified customer tasting reviews tied to orders, items, and ratings.'],
    ['public.profiles', 'Role-based authorization profiles (owner, outlet_manager, customer) linked to auth.'],
  ];

  let tY = doc.y;
  tables.forEach(([tbl, desc]) => {
    if (doc.y > 720) {
      doc.addPage();
      tY = doc.y;
    }
    doc.fillColor(colors.primaryDark).fontSize(8.5).font('Helvetica-Bold').text(tbl, 50, doc.y, { continued: true });
    doc.fillColor(colors.secondary).fontSize(8.5).font('Helvetica').text(`: ${desc}`);
    doc.moveDown(0.2);
  });

  addSectionTitle('5.2 Automated Database Triggers & Functions');
  addBullet('trg_generate_order_id', 'Before INSERT on public.orders. Automatically assigns sequential human-readable IDs formatted as GKSWAD-00001, GKSWAD-00002 using PostgreSQL sequence.');
  addBullet('trg_decrement_portions_on_order', 'After INSERT on public.orders. Atomically parses order items and decrements portionsLeft in public.products.outlets JSONB, automatically switching inStock = false when portions reach 0.');
  addBullet('handle_new_user', 'After INSERT on auth.users. Automatically provisions a public.profiles record with role assignment (owner for admin emails, outlet_manager for hub managers, or customer).');

  addSectionTitle('5.3 Security Hardening & Row Level Security (RLS)');
  addParagraph('All database tables have Row Level Security enabled. Security definer functions get_auth_role() and is_owner() ensure that kitchen managers can never view or modify data outside their assigned outlet_id, and customers can only view their own orders, addresses, and loyalty rewards.');

  // ==========================================
  // PAGE NUMBERING ON ALL PAGES
  // ==========================================
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    // Skip cover page footer
    if (i > 0) {
      doc.fillColor(colors.muted).fontSize(8).font('Helvetica').text(
        `Gaon Ka Swad • Multi-Outlet Cloud Kitchen PRD • Page ${i + 1} of ${range.count}`,
        50,
        790,
        { align: 'center', width: 495 }
      );
    }
  }

  doc.end();
  console.log('PDF generation complete. Target files created.');
}

buildPRD();
