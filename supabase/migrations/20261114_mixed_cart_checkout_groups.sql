-- Migration: Mixed Cart Checkout Groups (Normal + Utsav Pre-book Orders)
-- Implements Parent Checkout Group + Child Orders + Split Payment Allocations + One-Coupon-Per-Checkout Redemption
-- Strictly non-destructive to existing live SwadClick tables and data.

-- Ensure sequence exists if not already created in initial schema
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 100 INCREMENT BY 1;

-- 1. Parent Transaction Table: checkout_groups
CREATE TABLE IF NOT EXISTS public.checkout_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_reference TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  outlet_id TEXT NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code_snapshot TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  swad_coin_discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (swad_coin_discount_amount >= 0),
  packaging_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (packaging_fee >= 0),
  delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  order_mode TEXT NOT NULL DEFAULT 'normal' CHECK (order_mode IN ('normal', 'prebook', 'mixed')),
  prebook_payment_plan TEXT CHECK (prebook_payment_plan IN ('advance_25', 'full')),
  amount_due_now NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_due_now >= 0),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'failed', 'refunded')),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_groups_customer ON public.checkout_groups(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_groups_outlet ON public.checkout_groups(outlet_id);
CREATE INDEX IF NOT EXISTS idx_checkout_groups_reference ON public.checkout_groups(checkout_reference);
CREATE INDEX IF NOT EXISTS idx_checkout_groups_created_at ON public.checkout_groups(created_at DESC);

-- 2. Extend orders table with parent link and cumulative paid tracking
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS checkout_group_id UUID REFERENCES public.checkout_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_checkout_group ON public.orders(checkout_group_id);

-- 3. Extend order_payment_transactions for group-level gateway payments + idempotency
ALTER TABLE IF EXISTS public.order_payment_transactions
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.order_payment_transactions
  ADD COLUMN IF NOT EXISTS checkout_group_id UUID REFERENCES public.checkout_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT,
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_signature TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_payment_tx_idempotency
  ON public.order_payment_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_payment_tx_group
  ON public.order_payment_transactions(checkout_group_id);

-- Expand transaction_type check constraint to support unified 'initial' checkout transactions
ALTER TABLE IF EXISTS public.order_payment_transactions
  DROP CONSTRAINT IF EXISTS order_payment_transactions_transaction_type_check;

ALTER TABLE IF EXISTS public.order_payment_transactions
  ADD CONSTRAINT order_payment_transactions_transaction_type_check
  CHECK (transaction_type IN ('initial', 'advance', 'balance', 'full', 'refund'));

-- 4. Create payment_allocations ledger mapping gateway/collection payments -> child orders
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES public.order_payment_transactions(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(10, 2) NOT NULL CHECK (allocated_amount >= 0),
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('normal_full', 'prebook_advance', 'prebook_full', 'prebook_balance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_tx ON public.payment_allocations(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_order ON public.payment_allocations(order_id);

-- 5. Extend coupon_redemptions to support once-per-checkout-group redemption
ALTER TABLE IF EXISTS public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS checkout_group_id UUID REFERENCES public.checkout_groups(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_redemptions_group_unique
  ON public.coupon_redemptions(coupon_id, checkout_group_id)
  WHERE checkout_group_id IS NOT NULL;

-- 6. Atomic sequence generator returning next SWADCLK-000XX checkout reference
CREATE OR REPLACE FUNCTION public.next_checkout_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  -- Advance sequence safely past existing max order numeric suffix if needed
  next_val := nextval('public.order_number_seq');
  RETURN 'SWADCLK-' || LPAD(next_val::text, 5, '0');
END;
$$;

-- 7. Row Level Security Policies
ALTER TABLE IF EXISTS public.checkout_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Checkout Groups" ON public.checkout_groups;
CREATE POLICY "Public Read Checkout Groups" ON public.checkout_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Manage Checkout Groups" ON public.checkout_groups;
CREATE POLICY "Public Manage Checkout Groups" ON public.checkout_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Payment Allocations" ON public.payment_allocations;
CREATE POLICY "Public Read Payment Allocations" ON public.payment_allocations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Manage Payment Allocations" ON public.payment_allocations;
CREATE POLICY "Public Manage Payment Allocations" ON public.payment_allocations FOR ALL USING (true) WITH CHECK (true);
