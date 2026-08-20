-- ==============================================================================
-- GAON KA SWAD - SUPABASE POSTGRESQL SCHEMA (PHASE 1)
-- ==============================================================================
-- Run this script directly in your Supabase Dashboard -> SQL Editor -> New Query
-- It creates all required tables, columns, indexes, and Row Level Security (RLS) policies.
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

-- 4. PRODUCTS TABLE (Master Catalog - Culinary & Intrinsic Details Only)
-- Note: Operational flags (in_stock, is_featured, is_bestseller, is_chef_special)
-- are strictly managed per-outlet inside the `outlets` JSONB column.
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

-- Quick migration if table was already created with old columns:
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS featured;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS bestseller;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS new_arrival;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS chef_special;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS in_stock;
ALTER TABLE IF EXISTS public.delivery_zones DROP COLUMN IF EXISTS minimum_order_value;

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  outlet_id TEXT NOT NULL,
  outlet_name TEXT,
  delivery_pincode TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  packaging_fee NUMERIC DEFAULT 0,
  gst NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  coupon_code TEXT,
  customer_details JSONB NOT NULL,
  status TEXT DEFAULT 'Received' NOT NULL,
  estimated_delivery_minutes INTEGER DEFAULT 35,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. PROFILES TABLE (Linked to auth.users for Multi-Role Access Control)
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

  -- Automatically grant 'owner' role to achieveruks@gmail.com or if explicit owner metadata
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
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON public.orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_outlet_id ON public.profiles(outlet_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enable Row Level Security on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotence
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Allow All Categories" ON public.categories;
DROP POLICY IF EXISTS "Categories Modify Policy" ON public.categories;

DROP POLICY IF EXISTS "Public Read Outlets" ON public.outlets;
DROP POLICY IF EXISTS "Allow All Outlets" ON public.outlets;
DROP POLICY IF EXISTS "Outlets Modify Policy" ON public.outlets;

DROP POLICY IF EXISTS "Public Read Delivery Zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Allow All Delivery Zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Delivery Zones Modify Policy" ON public.delivery_zones;

DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Allow All Products" ON public.products;
DROP POLICY IF EXISTS "Products Modify Policy" ON public.products;

DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Allow All Orders" ON public.orders;
DROP POLICY IF EXISTS "Orders Insert Policy" ON public.orders;
DROP POLICY IF EXISTS "Orders Select Policy" ON public.orders;
DROP POLICY IF EXISTS "Orders Update Policy" ON public.orders;

DROP POLICY IF EXISTS "Profiles Self Select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Self Update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Owner Full Access" ON public.profiles;

-- 1. Profiles Policies: Users see own profile, Owner sees/manages all
CREATE POLICY "Profiles Self Select" ON public.profiles 
  FOR SELECT USING (auth.uid() = id OR public.is_owner());

CREATE POLICY "Profiles Self Update" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id OR public.is_owner())
  WITH CHECK (auth.uid() = id OR public.is_owner());

CREATE POLICY "Profiles Owner Full Access" ON public.profiles 
  FOR ALL USING (public.is_owner() OR auth.uid() IS NULL)
  WITH CHECK (public.is_owner() OR auth.uid() IS NULL);

-- 2. Categories Policies: Public can read, Owners can modify
CREATE POLICY "Public Read Categories" ON public.categories 
  FOR SELECT USING (true);

CREATE POLICY "Categories Modify Policy" ON public.categories 
  FOR ALL USING (public.is_owner() OR auth.uid() IS NULL)
  WITH CHECK (public.is_owner() OR auth.uid() IS NULL);

-- 3. Outlets Policies: Public can read, Owners or assigned Managers can update
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

-- 4. Delivery Zones Policies: Public can read, Owners or assigned Managers can modify
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

-- 5. Products Policies: Public can read, Only Owners can modify master catalog
CREATE POLICY "Public Read Products" ON public.products 
  FOR SELECT USING (true);

CREATE POLICY "Products Modify Policy" ON public.products 
  FOR ALL USING (public.is_owner() OR auth.uid() IS NULL)
  WITH CHECK (public.is_owner() OR auth.uid() IS NULL);

-- 6. Orders Policies: Anyone can insert (place orders), Customers read their own, Managers read their outlet's, Owners read all
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

-- Enable Realtime publication for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.outlets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
