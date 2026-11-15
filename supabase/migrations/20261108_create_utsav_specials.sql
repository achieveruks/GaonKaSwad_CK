-- Migration: Utsav Specials (Festival Pre-booking Feature)
-- Adds festive_events table, order_payment_transactions ledger,
-- extends products, orders, order_items, and abouts tables with festival configurations.

-- 1. Create festive_events table
CREATE TABLE IF NOT EXISTS public.festive_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  banner_image TEXT,
  festival_date DATE NOT NULL,
  booking_start_at TIMESTAMPTZ NOT NULL,
  booking_end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_festive_events_outlet_ids ON public.festive_events USING GIN (outlet_ids);
CREATE INDEX IF NOT EXISTS idx_festive_events_festival_date ON public.festive_events(festival_date);
CREATE INDEX IF NOT EXISTS idx_festive_events_status ON public.festive_events(status);

-- 2. Create order_payment_transactions table
CREATE TABLE IF NOT EXISTS public.order_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('advance', 'balance', 'full', 'refund')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(50) DEFAULT 'online',
  status VARCHAR(50) NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  gateway_payment_id TEXT,
  gateway_reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payment_tx_order ON public.order_payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_tx_type ON public.order_payment_transactions(transaction_type);

-- 3. Extend products table for festive collections & pre-booking
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS festive_event_id UUID REFERENCES public.festive_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS availability_mode VARCHAR(50) DEFAULT 'normal' CHECK (availability_mode IN ('normal', 'prebook_only')),
  ADD COLUMN IF NOT EXISTS max_booking_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS special_packaging BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS festive_product BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_festive_event ON public.products(festive_event_id);

-- 4. Extend orders table for pre-booking & advance/balance tracking
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS payment_plan VARCHAR(50) DEFAULT 'full' CHECK (payment_plan IN ('full', 'advance_25')),
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10, 2) DEFAULT 0 CHECK (advance_amount >= 0),
  ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10, 2) DEFAULT 0 CHECK (balance_amount >= 0),
  ADD COLUMN IF NOT EXISTS festive_event_id UUID REFERENCES public.festive_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS festival_delivery_at DATE,
  ADD COLUMN IF NOT EXISTS festival_name TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_festive_event ON public.orders(festive_event_id);

-- 5. Extend order_items table for permanent historical snapshots
ALTER TABLE IF EXISTS public.order_items
  ADD COLUMN IF NOT EXISTS festival_name TEXT,
  ADD COLUMN IF NOT EXISTS festival_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS special_packaging BOOLEAN DEFAULT false;

-- 7. Row Level Security Policies
ALTER TABLE IF EXISTS public.festive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Festive Events" ON public.festive_events;
CREATE POLICY "Public Read Festive Events" ON public.festive_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Manage Festive Events" ON public.festive_events;
CREATE POLICY "Public Manage Festive Events" ON public.festive_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Payment Transactions" ON public.order_payment_transactions;
CREATE POLICY "Public Read Payment Transactions" ON public.order_payment_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Manage Payment Transactions" ON public.order_payment_transactions;
CREATE POLICY "Public Manage Payment Transactions" ON public.order_payment_transactions FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed / Register utsav_specials category in categories table
INSERT INTO public.categories (id, name, slug, tagline, image, icon_name, sort_order)
VALUES (
  'utsav_specials',
  'Utsav Specials',
  'utsav_specials',
  'Celebrate Every Occasion with Something Special! Bring the home experience with homely special food and don’t feel left behind due to food cravings.',
  '/images/categories/utsav_specials.jpg',
  'Sparkles',
  99
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    image = EXCLUDED.image,
    icon_name = EXCLUDED.icon_name;

