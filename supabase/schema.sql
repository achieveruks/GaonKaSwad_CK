-- ==============================================================================
-- GAON KA SWAD - COMPLETE SUPABASE POSTGRESQL PRODUCTION SCHEMA & MIGRATIONS
-- ==============================================================================
-- Run this entire script directly in your Supabase Dashboard -> SQL Editor -> New Query
-- It safely creates/updates all tables, columns, indexes, and RLS policies.
-- ==============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  image TEXT,
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. OUTLETS TABLE
CREATE TABLE IF NOT EXISTS public.outlets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  address TEXT NOT NULL,
  fssai_lic_id NUMERIC, -- Strictly numeric 14-digit FSSAI License ID
  phone TEXT,
  email TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  minimum_order_value NUMERIC DEFAULT 200 NOT NULL,
  free_delivery_threshold NUMERIC DEFAULT 499 NOT NULL,
  packaging_fee NUMERIC DEFAULT 25 NOT NULL,
  avg_cooking_time TEXT DEFAULT '25-35 mins',
  delivery_fee NUMERIC DEFAULT 40,
  operating_hours TEXT DEFAULT '11:00 AM - 11:30 PM',
  hero_fire_line TEXT DEFAULT 'ARTISANAL CLOUD KITCHEN • SLOW-COOKED DUM',
  hero_header TEXT DEFAULT 'Authentic Indian Flavors, Slow-Cooked to Perfection',
  hero_description TEXT DEFAULT 'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills, delivered piping hot to your doorstep in sealed eco-handis.',
  trust_badge_rating TEXT DEFAULT '4.9 ★ (2.8k+)',
  trust_badge_rating_sub TEXT DEFAULT 'Google & Zomato',
  trust_badge_usp TEXT DEFAULT '100% Pure',
  trust_badge_usp_sub TEXT DEFAULT 'Desi Ghee Recipe',
  assigned_product_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.outlets
ALTER TABLE IF EXISTS public.outlets ADD COLUMN IF NOT EXISTS fssai_lic_id NUMERIC;
UPDATE public.outlets SET fssai_lic_id = 11523034000000 WHERE fssai_lic_id IS NULL;

-- 3. DELIVERY ZONES TABLE
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id TEXT PRIMARY KEY,
  name TEXT,
  outlet_id TEXT NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  pin_codes JSONB DEFAULT '[]'::jsonb NOT NULL,
  delivery_fee NUMERIC DEFAULT 40 NOT NULL,
  estimated_delivery_time TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. PRODUCTS TABLE (Master Catalog)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hindi_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  story TEXT,
  culinary_title TEXT,
  cooking_method_title TEXT,
  cooking_method_desc TEXT,
  aroma_title TEXT,
  aroma_desc TEXT,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  category TEXT NOT NULL,
  rating NUMERIC DEFAULT 4.8,
  reviews_count INTEGER DEFAULT 1,
  image TEXT NOT NULL,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  is_veg BOOLEAN DEFAULT TRUE NOT NULL,
  is_jain_friendly BOOLEAN DEFAULT FALSE,
  spice_level TEXT DEFAULT 'Medium',
  prep_time_minutes INTEGER DEFAULT 30,
  serves TEXT DEFAULT 'Serves 1-2',
  calories INTEGER,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  outlets JSONB DEFAULT '[]'::jsonb NOT NULL,
  outlet_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb,
  addons JSONB DEFAULT '[]'::jsonb,
  ingredients JSONB DEFAULT '[]'::jsonb,
  allergens JSONB DEFAULT '[]'::jsonb,
  reviews_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. CUSTOMERS TABLE (Phone-first Customer Accounts & Profiles)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  full_name VARCHAR(150),
  email VARCHAR(255),
  is_phone_verified BOOLEAN DEFAULT true,
  marketing_consent BOOLEAN DEFAULT false,
  welcome_discount_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. CUSTOMER SAVED ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Home',
  full_address TEXT NOT NULL,
  landmark VARCHAR(150),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT 'Odisha' NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.customer_addresses (Rename address_line1 -> full_address and drop address_line2)
DO $$
BEGIN
  -- 1. If full_address doesn't exist but address_line1 exists, rename or copy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customer_addresses' AND column_name = 'full_address'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'customer_addresses' AND column_name = 'address_line1'
    ) THEN
      -- Populate full_address with combined line1 + line2 if line2 existed
      ALTER TABLE public.customer_addresses ADD COLUMN full_address TEXT;
      UPDATE public.customer_addresses 
      SET full_address = CASE 
        WHEN address_line2 IS NOT NULL AND TRIM(address_line2) != '' 
        THEN TRIM(address_line1) || ', ' || TRIM(address_line2)
        ELSE TRIM(address_line1)
      END;
      ALTER TABLE public.customer_addresses ALTER COLUMN full_address SET NOT NULL;
    ELSE
      ALTER TABLE public.customer_addresses ADD COLUMN full_address TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;

  -- 2. Drop unused legacy columns if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customer_addresses' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE public.customer_addresses DROP COLUMN address_line1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customer_addresses' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE public.customer_addresses DROP COLUMN address_line2;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.customer_addresses ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Odisha';
ALTER TABLE IF EXISTS public.customer_addresses ADD COLUMN IF NOT EXISTS landmark VARCHAR(150);
ALTER TABLE IF EXISTS public.customer_addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Optional: Clean up any duplicate addresses for the same customer (keeps the latest)
DELETE FROM public.customer_addresses a USING public.customer_addresses b
WHERE a.customer_id = b.customer_id 
  AND a.full_address = b.full_address 
  AND a.created_at < b.created_at;

-- 7. ORDERS TABLE (Production Normalized Order Master)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,                                                   -- Unique Order ID (e.g. order-abc1234)
  order_number TEXT NOT NULL UNIQUE,                                     -- Human-readable Order ID (e.g. GKSWAD-#10001)
  order_id TEXT UNIQUE,                                                  -- Compatible alias for order_number
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,   -- Registered Customer Reference (nullable for guest)
  customer_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL, -- Saved Address Reference
  address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL, -- Compatible alias for customer_address_id
  outlet_id TEXT NOT NULL REFERENCES public.outlets(id),                 -- Mandatory Outlet Reference
  order_type TEXT DEFAULT 'delivery',                                    -- delivery | pickup
  is_self_pickup BOOLEAN DEFAULT false,                                  -- True if customer self-pickup

  -- Order & Payment Statuses (Separated)
  order_status VARCHAR(50) DEFAULT 'received',                           -- received | confirmed | preparing | ready | out_for_delivery | delivered | cancelled
  status TEXT DEFAULT 'Received',                                        -- Compatible UI status string
  payment_status VARCHAR(50) DEFAULT 'pending',                          -- pending | paid | failed | refunded | partially_refunded
  payment_method VARCHAR(50) DEFAULT 'cod',                              -- online | cod

  -- Server-authoritative Pricing Fields
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),             -- Sum of order item totals
  delivery_fee NUMERIC NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),     -- Applicable delivery fee
  packaging_fee NUMERIC NOT NULL DEFAULT 0 CHECK (packaging_fee >= 0),   -- Food packaging charge
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0), -- Total discount amount
  discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),             -- Compatible alias for discount_amount
  tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),         -- 5% GST tax amount
  gst NUMERIC NOT NULL DEFAULT 0 CHECK (gst >= 0),                       -- Compatible alias for tax_amount
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),     -- Final total payable amount
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),                   -- Compatible alias for total_amount

  -- Discount & Coupon Metadata
  discount_type VARCHAR(50) DEFAULT 'NONE',                              -- WELCOME | COUPON | NONE
  discount_code TEXT,                                                    -- Promo code used (e.g. WELCOME30, DESI50)
  coupon_code TEXT,                                                      -- Compatible alias for discount_code
  discount_description TEXT,                                             -- Descriptive discount text
  welcome_discount_applied BOOLEAN DEFAULT false,                        -- Welcome discount boolean flag
  welcome_discount_amount NUMERIC NOT NULL DEFAULT 0,                    -- Welcome discount in INR

  -- Historical Customer Snapshot (Permanent record)
  customer_name TEXT,                                                    -- Customer name at time of order
  customer_phone TEXT,                                                   -- Customer phone at time of order
  customer_details JSONB DEFAULT '{}'::jsonb,                            -- Full customer info snapshot

  -- Historical Delivery Address Snapshot (Permanent record)
  delivery_address_snapshot JSONB DEFAULT '{}'::jsonb,                   -- Address object snapshot at checkout
  delivery_pincode TEXT,                                                 -- Delivery PIN code
  delivery_instructions TEXT,                                            -- Gate/cooking delivery notes
  delivery_notes TEXT,                                                   -- Compatible alias for delivery_instructions
  delivery_slot VARCHAR(50) DEFAULT 'immediate',                         -- immediate | lunch | dinner | custom
  estimated_delivery_minutes INTEGER DEFAULT 35,

  -- Payment Gateway Integration (Razorpay ready)
  payment_gateway TEXT,                                                  -- razorpay | cashfree | paytm
  payment_gateway_order_id TEXT,                                         -- Gateway Order ID (e.g. order_O12345)
  payment_gateway_payment_id TEXT,                                       -- Gateway Payment ID (e.g. pay_P12345)
  payment_gateway_signature TEXT,                                        -- Gateway Webhook / Callback Signature
  paid_at TIMESTAMPTZ,                                                   -- Payment completion timestamp

  -- Operational Timestamps for Analytics & Live Tracking
  placed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,                                              -- Reason if cancelled

  -- Optional denormalized items array for ultra-fast single-query caching
  items JSONB DEFAULT '[]'::jsonb NOT NULL,

  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.orders
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'confirmed';
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50) DEFAULT 'NONE';
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS discount_description TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_gateway_order_id TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_gateway_payment_id TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_gateway_signature TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS placed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 8. ORDER_ITEMS TABLE (Normalized Line Items with Historical Price Snapshots)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,     -- Product Reference
  product_name TEXT NOT NULL,                                            -- Snapshot of Product Name
  product_variant_name TEXT,                                             -- Snapshot of Variant Name (e.g. 500g Handi, Full)
  quantity INTEGER NOT NULL CHECK (quantity > 0),                        -- Ordered Quantity
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),                   -- Snapshot of Unit Price at purchase time
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),-- Item discount
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),                 -- Computed Total Price (unit_price * quantity - discount)
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON public.orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ============================================================================
-- AUTO-INCREMENT ORDER NUMBERS & ATOMIC INVENTORY DECREMENT
-- ============================================================================

-- Sequence for Auto-Incrementing Order IDs (e.g. GKSWAD-#001, GKSWAD-#002)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1;

-- Function: Automatically format order_id as GKSWAD-#001, GKSWAD-#002, ...
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF NEW.order_id IS NULL OR NEW.order_id = '' OR NEW.order_id LIKE 'temp-%' OR NEW.order_id NOT LIKE 'GKSWAD-#%' THEN
    seq_val := nextval('public.order_number_seq');
    NEW.order_id := 'GKSWAD-#' || LPAD(seq_val::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_id ON public.orders;
CREATE TRIGGER trg_generate_order_id
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_id();

-- Function: Atomically Decrement Product Portions in public.products.outlets
CREATE OR REPLACE FUNCTION public.decrement_product_portions(
  p_outlet_id TEXT,
  p_items JSONB
)
RETURNS VOID AS $$
DECLARE
  item JSONB;
  p_id TEXT;
  p_qty INT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Extract product ID (handles item.product.id or item.productId or item.id)
    p_id := item->'product'->>'id';
    IF p_id IS NULL THEN
      p_id := item->>'productId';
    END IF;
    IF p_id IS NULL THEN
      p_id := item->>'id';
    END IF;

    p_qty := COALESCE((item->>'quantity')::INT, 1);

    IF p_id IS NOT NULL THEN
      -- Atomically update the outlets JSONB array for this product
      UPDATE public.products
      SET outlets = (
        SELECT jsonb_agg(
          CASE 
            WHEN elem->>'outletId' = p_outlet_id 
              AND elem->'portionsLeft' IS NOT NULL 
              AND elem->>'portionsLeft' != 'null' THEN
              jsonb_set(
                jsonb_set(
                  elem,
                  '{portionsLeft}',
                  to_jsonb(GREATEST(0, (elem->>'portionsLeft')::INT - p_qty))
                ),
                '{inStock}',
                to_jsonb(CASE WHEN ((elem->>'portionsLeft')::INT - p_qty) <= 0 THEN false ELSE COALESCE((elem->>'inStock')::BOOLEAN, true) END)
              )
            ELSE elem
          END
        )
        FROM jsonb_array_elements(outlets) AS elem
      ),
      updated_at = NOW()
      WHERE id = p_id 
        AND outlets IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(outlets) AS elem 
          WHERE elem->>'outletId' = p_outlet_id 
            AND elem->'portionsLeft' IS NOT NULL 
            AND elem->>'portionsLeft' != 'null'
        );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Atomically decrement portions on order placement
CREATE OR REPLACE FUNCTION public.trg_on_order_placed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.decrement_product_portions(NEW.outlet_id, NEW.items);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_portions_on_order ON public.orders;
CREATE TRIGGER trg_decrement_portions_on_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_on_order_placed();

-- 8. PRODUCT REVIEWS TABLE (Verified Customer Tastings)
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  order_id TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_phone VARCHAR(15),
  user_name VARCHAR(150) NOT NULL,
  user_location VARCHAR(100) DEFAULT 'Bangalore',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.reviews
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(15);
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS user_name VARCHAR(150);
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS user_location VARCHAR(100) DEFAULT 'Bangalore';
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- 9. PROFILES TABLE (Linked to auth.users for Multi-Role Owner / Manager Access)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('owner', 'outlet_manager', 'customer')),
  outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS outlet_id TEXT;

-- 10. ABOUTS TABLE (1:1 with Outlets for Dynamic About Page Customization)
CREATE TABLE IF NOT EXISTS public.abouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id TEXT NOT NULL UNIQUE REFERENCES public.outlets(id) ON DELETE CASCADE,
  hero_fire_line TEXT,
  hero_header TEXT,
  hero_description TEXT,
  story_line TEXT,
  story_title TEXT,
  story_description TEXT,
  story_highlight1_title TEXT,
  story_highlight1_description TEXT,
  story_highlight2_title TEXT,
  story_highlight2_description TEXT,
  outlet_image TEXT,
  exp_line TEXT DEFAULT 'THE GAON KA SWAD EXPERIENCE',
  exp_header TEXT DEFAULT 'Food That Feels Like Home',
  exp_description TEXT DEFAULT 'From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special.',
  exp_card1_title TEXT DEFAULT '🏠 Familiar Flavours',
  exp_card1_header TEXT DEFAULT 'Taste That Feels Like Home',
  exp_card1_description TEXT DEFAULT 'Comforting Indian flavours inspired by the food we know, love, and grew up sharing.',
  exp_card2_title TEXT DEFAULT '🍽️ Made With Care',
  exp_card2_header TEXT DEFAULT 'Every Order Matters',
  exp_card2_description TEXT DEFAULT 'We prepare each order with attention to freshness, consistency, and the little details that make a meal memorable.',
  exp_card3_title TEXT DEFAULT '❤️ Your Experience',
  exp_card3_header TEXT DEFAULT 'We Listen & Improve',
  exp_card3_description TEXT DEFAULT 'Your feedback helps us get better. Every rating, review, and suggestion helps shape the Gaon Ka Swad experience.',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.abouts
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS outlet_id TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS hero_fire_line TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS hero_header TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS hero_description TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_line TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_title TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_description TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_highlight1_title TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_highlight1_description TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_highlight2_title TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS story_highlight2_description TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS outlet_image TEXT;
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_line TEXT DEFAULT 'THE GAON KA SWAD EXPERIENCE';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_header TEXT DEFAULT 'Food That Feels Like Home';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_description TEXT DEFAULT 'From the way we cook to the way we serve, every detail is designed to make your meal feel a little more special.';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card1_title TEXT DEFAULT '🏠 Familiar Flavours';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card1_header TEXT DEFAULT 'Taste That Feels Like Home';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card1_description TEXT DEFAULT 'Comforting Indian flavours inspired by the food we know, love, and grew up sharing.';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card2_title TEXT DEFAULT '🍽️ Made With Care';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card2_header TEXT DEFAULT 'Every Order Matters';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card2_description TEXT DEFAULT 'We prepare each order with attention to freshness, consistency, and the little details that make a meal memorable.';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card3_title TEXT DEFAULT '❤️ Your Experience';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card3_header TEXT DEFAULT 'We Listen & Improve';
ALTER TABLE IF EXISTS public.abouts ADD COLUMN IF NOT EXISTS exp_card3_description TEXT DEFAULT 'Your feedback helps us get better. Every rating, review, and suggestion helps shape the Gaon Ka Swad experience.';

-- ==============================================================================
-- HELPER FUNCTIONS FOR SECURITY DEFINER RLS EVALUATION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'customer'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_outlet_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT outlet_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER (AUTH.USERS -> PUBLIC.PROFILES)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT;
  assigned_outlet TEXT;
  meta_role TEXT;
BEGIN
  meta_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', ''));

  IF LOWER(NEW.email) = 'achieveruks@gmail.com' OR meta_role = 'owner' THEN
    assigned_role := 'owner';
    assigned_outlet := NULL;
  ELSIF meta_role = 'outlet_manager' THEN
    assigned_role := 'outlet_manager';
    assigned_outlet := NEW.raw_user_meta_data->>'outlet_id';
  ELSE
    assigned_role := 'customer';
    assigned_outlet := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, outlet_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    assigned_role,
    assigned_outlet,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = CASE WHEN public.profiles.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_outlets_city ON public.outlets(city);
CREATE INDEX IF NOT EXISTS idx_outlets_active ON public.outlets(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_outlet ON public.delivery_zones(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON public.orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_phone ON public.reviews(customer_phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_outlet_id ON public.profiles(outlet_id);
CREATE INDEX IF NOT EXISTS idx_abouts_outlet_id ON public.abouts(outlet_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abouts ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotence
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Categories Modify Policy" ON public.categories;
DROP POLICY IF EXISTS "Public Read Outlets" ON public.outlets;
DROP POLICY IF EXISTS "Outlets Modify Policy" ON public.outlets;
DROP POLICY IF EXISTS "Public Read Delivery Zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Delivery Zones Modify Policy" ON public.delivery_zones;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Products Modify Policy" ON public.products;
DROP POLICY IF EXISTS "Public Read Customers" ON public.customers;
DROP POLICY IF EXISTS "Customers Manage Policy" ON public.customers;
DROP POLICY IF EXISTS "Public Read Customer Addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customer Addresses Manage Policy" ON public.customer_addresses;
DROP POLICY IF EXISTS "Orders Insert Policy" ON public.orders;
DROP POLICY IF EXISTS "Orders Select Policy" ON public.orders;
DROP POLICY IF EXISTS "Orders Update Policy" ON public.orders;
DROP POLICY IF EXISTS "Public Read Reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews Insert Policy" ON public.reviews;
DROP POLICY IF EXISTS "Profiles Self Select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Self Update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Owner Full Access" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Abouts" ON public.abouts;
DROP POLICY IF EXISTS "Abouts Modify Policy" ON public.abouts;

-- 1. Profiles Policies
CREATE POLICY "Profiles Self Select" ON public.profiles 
  FOR SELECT USING (auth.uid() = id OR public.is_owner());

CREATE POLICY "Profiles Self Update" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id OR public.is_owner())
  WITH CHECK (auth.uid() = id OR public.is_owner());

CREATE POLICY "Profiles Owner Full Access" ON public.profiles 
  FOR ALL USING (public.is_owner() OR auth.uid() IS NULL)
  WITH CHECK (public.is_owner() OR auth.uid() IS NULL);

-- 2. Categories Policies
CREATE POLICY "Public Read Categories" ON public.categories 
  FOR SELECT USING (true);

CREATE POLICY "Categories Modify Policy" ON public.categories 
  FOR ALL USING (public.is_owner() OR auth.uid() IS NULL)
  WITH CHECK (public.is_owner() OR auth.uid() IS NULL);

-- 3. Outlets Policies
CREATE POLICY "Public Read Outlets" ON public.outlets 
  FOR SELECT USING (true);

CREATE POLICY "Outlets Modify Policy" ON public.outlets 
  FOR ALL USING (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = id) OR
    auth.uid() IS NULL
  )
  WITH CHECK (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = id) OR
    auth.uid() IS NULL
  );

-- 4. Delivery Zones Policies
CREATE POLICY "Public Read Delivery Zones" ON public.delivery_zones 
  FOR SELECT USING (true);

CREATE POLICY "Delivery Zones Modify Policy" ON public.delivery_zones 
  FOR ALL USING (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR
    auth.uid() IS NULL
  )
  WITH CHECK (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR
    auth.uid() IS NULL
  );

-- 5. Products Policies
CREATE POLICY "Public Read Products" ON public.products 
  FOR SELECT USING (true);

CREATE POLICY "Products Modify Policy" ON public.products 
  FOR ALL USING (public.is_owner() OR auth.uid() IS NULL)
  WITH CHECK (public.is_owner() OR auth.uid() IS NULL);

-- 6. Customers & Addresses Policies
CREATE POLICY "Public Read Customers" ON public.customers 
  FOR SELECT USING (true);

CREATE POLICY "Customers Manage Policy" ON public.customers 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Customer Addresses" ON public.customer_addresses 
  FOR SELECT USING (true);

CREATE POLICY "Customer Addresses Manage Policy" ON public.customer_addresses 
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Orders Policies
CREATE POLICY "Orders Insert Policy" ON public.orders 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders Select Policy" ON public.orders 
  FOR SELECT USING (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR
    auth.uid() IS NULL
  );

CREATE POLICY "Orders Update Policy" ON public.orders 
  FOR UPDATE USING (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR
    auth.uid() IS NULL
  );

-- 7b. Order Items Policies
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order Items Insert Policy" ON public.order_items;
DROP POLICY IF EXISTS "Order Items Select Policy" ON public.order_items;

CREATE POLICY "Order Items Insert Policy" ON public.order_items 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Order Items Select Policy" ON public.order_items 
  FOR SELECT USING (true);

-- 8. Reviews Policies
CREATE POLICY "Public Read Reviews" ON public.reviews 
  FOR SELECT USING (true);

CREATE POLICY "Reviews Insert Policy" ON public.reviews 
  FOR INSERT WITH CHECK (true);

-- 9. Abouts Policies
CREATE POLICY "Public Read Abouts" ON public.abouts 
  FOR SELECT USING (true);

CREATE POLICY "Abouts Modify Policy" ON public.abouts 
  FOR ALL USING (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR
    auth.uid() IS NULL
  )
  WITH CHECK (
    public.is_owner() OR 
    (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR
    auth.uid() IS NULL
  );

-- Enable Realtime publication for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outlets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.abouts;
