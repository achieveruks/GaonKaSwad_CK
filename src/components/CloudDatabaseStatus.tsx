import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, ExternalLink, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { checkSupabaseHealth, seedSupabaseDatabase, SupabaseHealthStatus } from '../lib/supabaseService';
import { isSupabaseConfigured, SUPABASE_URL } from '../lib/supabase';
import { useProducts } from '../context/ProductContext';

export const CloudDatabaseStatus: React.FC = () => {
  const { refreshProducts } = useProducts();
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch (e: any) {
      setHealth({
        isConfigured: isSupabaseConfigured(),
        isConnected: false,
        tableCounts: { products: 0, outlets: 0, zones: 0, categories: 0, orders: 0 },
        error: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handleSeed = async (force = false) => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedSupabaseDatabase(force);
      setSeedResult(res.message);
      await loadHealth();
      await refreshProducts();
    } catch (err: any) {
      setSeedResult(`❌ Migration Error: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const sqlCode = `-- GAON KA SWAD - SUPABASE POSTGRESQL SCHEMA
-- Run this in Supabase Dashboard -> SQL Editor -> New Query

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
  hero_description TEXT DEFAULT 'Experience royal dum biryanis, 24-hour slow-simmered dal makhani, and smoky clay-oven tandoori grills.',
  trust_badge_rating TEXT DEFAULT '4.9 ★ (2.8k+)',
  trust_badge_rating_sub TEXT DEFAULT 'Google & Zomato',
  trust_badge_usp TEXT DEFAULT '100% Pure',
  trust_badge_usp_sub TEXT DEFAULT 'Desi Ghee Recipe',
  assigned_product_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'customer');
$$;

CREATE OR REPLACE FUNCTION public.get_auth_outlet_id()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT outlet_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role TEXT;
  assigned_outlet TEXT;
  meta_role TEXT;
BEGIN
  meta_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  IF LOWER(NEW.email) = 'achieveruks@gmail.com' OR meta_role = 'owner' THEN
    assigned_role := 'owner';
  ELSIF meta_role = 'outlet_manager' THEN
    assigned_role := 'outlet_manager';
    assigned_outlet := NEW.raw_user_meta_data->>'outlet_id';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, outlet_id, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'phone', assigned_role, assigned_outlet, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = CASE WHEN public.profiles.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END, updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Categories Modify Policy" ON public.categories FOR ALL USING (public.is_owner() OR auth.uid() IS NULL);

CREATE POLICY "Public Read Outlets" ON public.outlets FOR SELECT USING (true);
CREATE POLICY "Outlets Modify Policy" ON public.outlets FOR ALL USING (public.is_owner() OR (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = id) OR auth.uid() IS NULL);

CREATE POLICY "Public Read Delivery Zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Delivery Zones Modify Policy" ON public.delivery_zones FOR ALL USING (public.is_owner() OR (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR auth.uid() IS NULL);

CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Products Modify Policy" ON public.products FOR ALL USING (public.is_owner() OR auth.uid() IS NULL);

CREATE POLICY "Orders Insert Policy" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders Select Policy" ON public.orders FOR SELECT USING (public.is_owner() OR (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR auth.uid() IS NULL);
CREATE POLICY "Orders Update Policy" ON public.orders FOR UPDATE USING (public.is_owner() OR (public.get_auth_role() = 'outlet_manager' AND public.get_auth_outlet_id() = outlet_id) OR auth.uid() IS NULL);

CREATE POLICY "Profiles Self Select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_owner());
CREATE POLICY "Profiles Self Update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_owner());
CREATE POLICY "Profiles Owner Full Access" ON public.profiles FOR ALL USING (public.is_owner() OR auth.uid() IS NULL);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConnected = health?.isConnected;
  const hasZeroProducts = isConnected && health?.tableCounts.products === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-lg">Supabase PostgreSQL Database</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Phase 1 Active
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Project URL: <span className="font-mono text-gray-700">{SUPABASE_URL}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadHealth()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            title="Refresh connection status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Check Health
          </button>

          <button
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            SQL Schema
          </button>

          <button
            onClick={() => handleSeed(false)}
            disabled={seeding || !isConnected}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${
              !isConnected
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Syncing to Cloud...' : 'Seed / Sync All Data'}
          </button>
        </div>
      </div>

      {/* Connection & Table Counts */}
      <div className="mt-5">
        {isConnected ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-3 text-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Products</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">{health?.tableCounts.products ?? 0}</span>
                <span className="text-[10px] text-emerald-600 font-medium">PostgreSQL table</span>
              </div>
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-3 text-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Outlets</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">{health?.tableCounts.outlets ?? 0}</span>
                <span className="text-[10px] text-emerald-600 font-medium">PostgreSQL table</span>
              </div>
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-3 text-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Delivery Zones</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">{health?.tableCounts.zones ?? 0}</span>
                <span className="text-[10px] text-emerald-600 font-medium">PostgreSQL table</span>
              </div>
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-3 text-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Categories</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">{health?.tableCounts.categories ?? 0}</span>
                <span className="text-[10px] text-emerald-600 font-medium">PostgreSQL table</span>
              </div>
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-3 text-center">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Orders</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">{health?.tableCounts.orders ?? 0}</span>
                <span className="text-[10px] text-emerald-600 font-medium">PostgreSQL table</span>
              </div>
            </div>

            {hasZeroProducts && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tables exist in Supabase but are empty. Click <strong>"Seed / Sync All Data"</strong> to push your full artisanal menu and outlets to PostgreSQL.</span>
                </div>
                <button
                  onClick={() => handleSeed(false)}
                  disabled={seeding}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {seeding ? 'Populating...' : 'Populate Now'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-sm">Supabase Database Tables Not Initialized Yet</strong>
                <p className="text-red-700 mt-0.5">
                  To complete Phase 1, click <strong>"SQL Schema"</strong>, copy the script, and run it in your{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold inline-flex items-center gap-1"
                  >
                    Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                  </a>
                  . Once run, click <strong>"Check Health"</strong> and <strong>"Seed / Sync All Data"</strong>.
                </p>
                {health?.error && <p className="mt-1 font-mono text-[11px] text-red-600 bg-red-100/60 p-1.5 rounded">{health.error}</p>}
              </div>
            </div>
            <button
              onClick={() => setShowSqlModal(true)}
              className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm"
            >
              View & Copy SQL
            </button>
          </div>
        )}

        {seedResult && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-medium ${seedResult.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            {seedResult}
          </div>
        )}
      </div>

      {/* SQL Schema Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Supabase PostgreSQL Schema (Phase 1)</h4>
                  <p className="text-xs text-gray-500">Run this once in Supabase Dashboard → SQL Editor</p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap">{sqlCode}</pre>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                Creates: products, outlets, delivery_zones, categories, orders tables + indexes + RLS.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    copiedSql
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                  }`}
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy SQL Script
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 rounded-lg border border-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
