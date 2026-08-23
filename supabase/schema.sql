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
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  landmark VARCHAR(150),
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. ORDERS TABLE (Core Order History & Multi-Outlet Dispatch)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  outlet_id TEXT NOT NULL,
  outlet_name TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(150),
  customer_phone VARCHAR(15),
  customer_email VARCHAR(255),
  delivery_pincode TEXT,
  items JSONB DEFAULT '[]'::jsonb NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  packaging_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  welcome_discount_applied BOOLEAN DEFAULT false,
  total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  coupon_code TEXT,
  customer_details JSONB,
  delivery_address_snapshot JSONB,
  payment_method VARCHAR(50),
  status TEXT DEFAULT 'Received',
  order_status VARCHAR(50) DEFAULT 'ORDER_PLACED',
  estimated_delivery_minutes INTEGER DEFAULT 35,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safe Column Migrations for public.orders (in case table already existed with previous columns)
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS outlet_id TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS outlet_name TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(15);
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS delivery_pincode TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS gst NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS packaging_fee NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS welcome_discount_applied BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_details JSONB;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Received';
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'ORDER_PLACED';
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER DEFAULT 35;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

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
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.abouts;
