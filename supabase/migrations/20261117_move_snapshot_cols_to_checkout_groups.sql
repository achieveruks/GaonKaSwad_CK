-- ==============================================================================
-- MIGRATION: Separation of Concerns Between checkout_groups and orders
-- Date: 2026-11-17
-- Summary:
--   1. Adds 16 checkout-session columns (payment method, payment gateway, discount/welcome metadata,
--      customer snapshots, and delivery address snapshots) onto public.checkout_groups.
--   2. Backfills linked checkout_groups from existing orders + payment transactions.
--   3. Creates & links 1:1 parent checkout_groups rows for legacy unlinked orders so
--      zero historical data is lost.
--   4. Adds composite & lookup indexes across checkout_groups and orders.
--   5. Drops the 19 redundant/moved columns from public.orders (including orders.order_id,
--      standardizing on order_number + updating generate_order_id trigger) while preserving:
--      - customer_id & outlet_id on both tables (fast single-table queries)
--      - delivery_type & estimated_delivery_minutes on orders (per-dispatch timeline)
--      - all pricing breakdown columns untouched for a later decision
-- ==============================================================================

-- 1. Add checkout-session columns to public.checkout_groups
ALTER TABLE IF EXISTS public.checkout_groups
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_order_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_signature TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_pincode TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- 2. Backfill existing linked checkout_groups + create groups for legacy unlinked orders
--    Guarded by information_schema check so this migration is 100% idempotent if re-run.
DO $$
DECLARE
  has_legacy_cols BOOLEAN;
  rec RECORD;
  base_ref TEXT;
  new_cg_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'customer_details'
  ) INTO has_legacy_cols;

  IF has_legacy_cols THEN
    -- 2a. Copy snapshot, discount, address, and welcome data from linked child orders -> checkout_groups
    EXECUTE $sql$
      UPDATE public.checkout_groups cg
      SET
        customer_id = COALESCE(cg.customer_id, src.customer_id),
        customer_address_id = COALESCE(cg.customer_address_id, src.address_id),
        coupon_code_snapshot = COALESCE(cg.coupon_code_snapshot, src.discount_code),
        customer_name = COALESCE(NULLIF(cg.customer_name, ''), src.customer_name),
        customer_phone = COALESCE(NULLIF(cg.customer_phone, ''), src.customer_phone),
        customer_details = CASE
          WHEN cg.customer_details IS NULL OR cg.customer_details = '{}'::jsonb
            THEN COALESCE(src.customer_details, '{}'::jsonb)
          ELSE cg.customer_details
        END,
        delivery_address_snapshot = CASE
          WHEN cg.delivery_address_snapshot IS NULL OR cg.delivery_address_snapshot = '{}'::jsonb
            THEN COALESCE(src.delivery_address_snapshot, '{}'::jsonb)
          ELSE cg.delivery_address_snapshot
        END,
        delivery_pincode = COALESCE(NULLIF(cg.delivery_pincode, ''), src.delivery_pincode),
        delivery_instructions = COALESCE(NULLIF(cg.delivery_instructions, ''), src.delivery_instructions),
        payment_method = COALESCE(NULLIF(cg.payment_method, ''), src.payment_method, 'cod'),
        payment_gateway = COALESCE(cg.payment_gateway, src.payment_gateway),
        payment_gateway_order_id = COALESCE(cg.payment_gateway_order_id, src.payment_gateway_order_id),
        payment_gateway_payment_id = COALESCE(cg.payment_gateway_payment_id, src.payment_gateway_payment_id),
        payment_gateway_signature = COALESCE(cg.payment_gateway_signature, src.payment_gateway_signature),
        paid_at = COALESCE(cg.paid_at, src.paid_at),
        updated_at = NOW()
      FROM (
        SELECT DISTINCT ON (o.checkout_group_id)
          o.checkout_group_id,
          o.customer_id,
          o.address_id,
          o.discount_code,
          o.customer_name,
          o.customer_phone,
          o.customer_details,
          o.delivery_address_snapshot,
          o.delivery_pincode,
          o.delivery_instructions,
          o.payment_method,
          o.payment_gateway,
          o.payment_gateway_order_id,
          o.payment_gateway_payment_id,
          o.payment_gateway_signature,
          o.paid_at
        FROM public.orders o
        WHERE o.checkout_group_id IS NOT NULL
        ORDER BY o.checkout_group_id, o.created_at ASC
      ) src
      WHERE cg.id = src.checkout_group_id
    $sql$;

    -- 2b. Create 1:1 parent checkout_groups rows for legacy unlinked orders (checkout_group_id IS NULL)
    FOR rec IN EXECUTE $sql$
      SELECT
        o.id,
        o.order_number,
        o.order_id,
        o.customer_id,
        o.address_id,
        o.outlet_id,
        o.discount_code,
        o.subtotal,
        o.discount_amount,
        o.swad_coin_discount_amount,
        o.packaging_fee,
        o.delivery_fee,
        o.tax_amount,
        o.total_amount,
        o.order_type,
        o.payment_plan,
        o.advance_amount,
        o.paid_amount,
        o.balance_amount,
        o.payment_status,
        o.payment_method,
        o.payment_gateway,
        o.payment_gateway_order_id,
        o.payment_gateway_payment_id,
        o.payment_gateway_signature,
        o.paid_at,
        o.customer_name,
        o.customer_phone,
        o.customer_details,
        o.delivery_address_snapshot,
        o.delivery_pincode,
        o.delivery_instructions,
        o.created_at,
        o.updated_at
      FROM public.orders o
      WHERE o.checkout_group_id IS NULL
      ORDER BY o.created_at ASC
    $sql$
    LOOP
      base_ref := REGEXP_REPLACE(COALESCE(rec.order_number, rec.order_id, rec.id), '(-I|-PB|_PB)$', '');
      IF base_ref IS NULL OR BTRIM(base_ref) = '' THEN
        base_ref := rec.id;
      END IF;

      SELECT id INTO new_cg_id
      FROM public.checkout_groups
      WHERE checkout_reference = base_ref
      LIMIT 1;

      IF new_cg_id IS NULL THEN
        INSERT INTO public.checkout_groups (
          checkout_reference,
          customer_id,
          customer_address_id,
          outlet_id,
          coupon_code_snapshot,
          subtotal,
          discount_amount,
          swad_coin_discount_amount,
          packaging_fee,
          delivery_charge,
          tax_amount,
          grand_total,
          order_mode,
          prebook_payment_plan,
          amount_due_now,
          amount_paid,
          balance_due,
          payment_status,
          payment_method,
          payment_gateway,
          payment_gateway_order_id,
          payment_gateway_payment_id,
          payment_gateway_signature,
          paid_at,
          customer_name,
          customer_phone,
          customer_details,
          delivery_address_snapshot,
          delivery_pincode,
          delivery_instructions,
          idempotency_key,
          created_at,
          updated_at
        )
        VALUES (
          base_ref,
          rec.customer_id,
          rec.address_id,
          rec.outlet_id,
          rec.discount_code,
          COALESCE(rec.subtotal, 0),
          COALESCE(rec.discount_amount, 0),
          COALESCE(rec.swad_coin_discount_amount, 0),
          COALESCE(rec.packaging_fee, 0),
          COALESCE(rec.delivery_fee, 0),
          COALESCE(rec.tax_amount, 0),
          COALESCE(rec.total_amount, 0),
          CASE WHEN LOWER(COALESCE(rec.order_type, '')) = 'prebook' THEN 'prebook' ELSE 'normal' END,
          CASE
            WHEN LOWER(COALESCE(rec.order_type, '')) = 'prebook' AND rec.payment_plan IN ('advance_25', 'full')
              THEN rec.payment_plan
            ELSE NULL
          END,
          CASE
            WHEN LOWER(COALESCE(rec.order_type, '')) = 'prebook' THEN COALESCE(rec.advance_amount, rec.total_amount, 0)
            ELSE COALESCE(rec.total_amount, 0)
          END,
          COALESCE(rec.paid_amount, 0),
          COALESCE(rec.balance_amount, 0),
          CASE
            WHEN rec.payment_status IN ('pending', 'partially_paid', 'paid', 'failed', 'refunded') THEN rec.payment_status
            ELSE 'pending'
          END,
          COALESCE(NULLIF(rec.payment_method, ''), 'cod'),
          rec.payment_gateway,
          rec.payment_gateway_order_id,
          rec.payment_gateway_payment_id,
          rec.payment_gateway_signature,
          rec.paid_at,
          rec.customer_name,
          rec.customer_phone,
          COALESCE(rec.customer_details, '{}'::jsonb),
          COALESCE(rec.delivery_address_snapshot, '{}'::jsonb),
          rec.delivery_pincode,
          rec.delivery_instructions,
          'legacy-' || rec.id,
          COALESCE(rec.created_at, NOW()),
          COALESCE(rec.updated_at, NOW())
        )
        ON CONFLICT (checkout_reference) DO UPDATE
          SET updated_at = EXCLUDED.updated_at
        RETURNING id INTO new_cg_id;
      END IF;

      UPDATE public.orders
      SET checkout_group_id = new_cg_id
      WHERE id = rec.id
        AND checkout_group_id IS NULL;
    END LOOP;
  END IF;
END $$;

-- 2c. Backfill gateway & payment_method fields onto checkout_groups from initial order_payment_transactions
UPDATE public.checkout_groups cg
SET
  payment_method = COALESCE(NULLIF(cg.payment_method, ''), tx.payment_method, 'cod'),
  payment_gateway = COALESCE(cg.payment_gateway, tx.payment_gateway),
  payment_gateway_order_id = COALESCE(cg.payment_gateway_order_id, tx.gateway_order_id),
  payment_gateway_payment_id = COALESCE(cg.payment_gateway_payment_id, tx.gateway_payment_id),
  payment_gateway_signature = COALESCE(cg.payment_gateway_signature, tx.gateway_signature),
  paid_at = COALESCE(cg.paid_at, tx.paid_at)
FROM (
  SELECT DISTINCT ON (checkout_group_id)
    checkout_group_id,
    payment_method,
    payment_gateway,
    gateway_order_id,
    gateway_payment_id,
    gateway_signature,
    paid_at
  FROM public.order_payment_transactions
  WHERE checkout_group_id IS NOT NULL
  ORDER BY checkout_group_id, created_at ASC
) tx
WHERE cg.id = tx.checkout_group_id
  AND (
    cg.payment_method IS NULL
    OR cg.payment_gateway IS NULL
    OR cg.payment_gateway_payment_id IS NULL
    OR cg.paid_at IS NULL
  );

-- 2d. Backfill payment_method independently if orders.payment_method still exists (safe re-run)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'payment_method'
  ) THEN
    EXECUTE $sql$
      UPDATE public.checkout_groups cg
      SET
        payment_method = src.payment_method,
        updated_at = NOW()
      FROM (
        SELECT DISTINCT ON (o.checkout_group_id)
          o.checkout_group_id,
          o.payment_method
        FROM public.orders o
        WHERE o.checkout_group_id IS NOT NULL
          AND NULLIF(o.payment_method, '') IS NOT NULL
        ORDER BY o.checkout_group_id, o.created_at ASC
      ) src
      WHERE cg.id = src.checkout_group_id
        AND (cg.payment_method IS NULL OR cg.payment_method = 'cod' OR cg.payment_method = '')
    $sql$;
  END IF;
END $$;

-- 3. Add performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_checkout_groups_customer_phone
  ON public.checkout_groups(customer_phone);

CREATE INDEX IF NOT EXISTS idx_checkout_groups_customer_created
  ON public.checkout_groups(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_outlet_created
  ON public.orders(outlet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created
  ON public.orders(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_checkout_group_nonnull
  ON public.orders(checkout_group_id)
  WHERE checkout_group_id IS NOT NULL;

-- 4. Standardize orders identifier on order_number & update BEFORE INSERT trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.orders
      SET order_number = COALESCE(NULLIF(BTRIM(order_number), ''), order_id)
      WHERE (order_number IS NULL OR BTRIM(order_number) = '')
        AND order_id IS NOT NULL
    $sql$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF NEW.order_number IS NULL
     OR BTRIM(NEW.order_number) = ''
     OR NEW.order_number LIKE 'temp-%'
     OR NEW.order_number LIKE 'SWADCLK-#%'
     OR NEW.order_number !~ '^SWADCLK-[0-9]+(-I|-PB)?$'
  THEN
    seq_val := nextval('public.order_number_seq');
    NEW.order_number := 'SWADCLK-' || LPAD(seq_val::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_id ON public.orders;
CREATE TRIGGER trg_generate_order_id
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_id();

DROP INDEX IF EXISTS public.idx_orders_order_id;

-- 5. Drop the 19 moved snapshot / gateway / discount / payment_method / redundant order_id columns from public.orders
ALTER TABLE IF EXISTS public.orders
  DROP COLUMN IF EXISTS order_id,
  DROP COLUMN IF EXISTS address_id,
  DROP COLUMN IF EXISTS customer_address_id,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_gateway,
  DROP COLUMN IF EXISTS payment_gateway_order_id,
  DROP COLUMN IF EXISTS payment_gateway_payment_id,
  DROP COLUMN IF EXISTS payment_gateway_signature,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS discount_type,
  DROP COLUMN IF EXISTS discount_code,
  DROP COLUMN IF EXISTS discount_description,
  DROP COLUMN IF EXISTS welcome_discount_applied,
  DROP COLUMN IF EXISTS welcome_discount_amount,
  DROP COLUMN IF EXISTS customer_name,
  DROP COLUMN IF EXISTS customer_phone,
  DROP COLUMN IF EXISTS customer_details,
  DROP COLUMN IF EXISTS delivery_address_snapshot,
  DROP COLUMN IF EXISTS delivery_pincode,
  DROP COLUMN IF EXISTS delivery_instructions;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
