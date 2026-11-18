-- ==============================================================================
-- MIGRATION: Optimize Checkout Transaction Tables & Gateway Segregation
-- Date: 2026-11-17
-- Summary:
--   1. Safely backfills order_payment_transactions from checkout_groups gateway
--      fields & dead gateway_reference, and preserves placed_at / swad_coins_used
--      equivalents on public.orders before dropping redundant columns.
--   2. Segregates responsibilities cleanly across transaction tables:
--      - checkout_groups: Session header, customer/address snapshots, payment_method, totals
--      - orders: Kitchen dispatch, status timeline, items JSONB, swad_coin_discount_amount
--      - order_payment_transactions: Sole owner of gateway audit fields & paid_at
--      - payment_allocations: Split bridge between payment transactions & child orders
--   3. Drops 8 redundant/dead columns:
--      - checkout_groups (5): payment_gateway, payment_gateway_order_id,
--        payment_gateway_payment_id, payment_gateway_signature, paid_at
--      - orders (2): placed_at, swad_coins_used
--      - order_payment_transactions (1): gateway_reference
--   4. Adds reconciliation indexes & unified view public.v_checkout_transaction_summary.
-- ==============================================================================

-- 1. Backfill & preserve all historical data safely before column drops
DO $$
DECLARE
  has_cg_gateway_cols BOOLEAN;
  has_tx_gateway_ref BOOLEAN;
  has_orders_placed_at BOOLEAN;
  has_orders_swad_coins BOOLEAN;
BEGIN
  -- 1a. Ensure order_payment_transactions.checkout_group_id is linked via child orders when missing
  UPDATE public.order_payment_transactions tx
  SET checkout_group_id = o.checkout_group_id
  FROM public.orders o
  WHERE tx.checkout_group_id IS NULL
    AND tx.order_id IS NOT NULL
    AND tx.order_id = o.id
    AND o.checkout_group_id IS NOT NULL;

  -- 1b. Preserve any legacy gateway_reference into gateway_payment_id
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_payment_transactions'
      AND column_name = 'gateway_reference'
  ) INTO has_tx_gateway_ref;

  IF has_tx_gateway_ref THEN
    EXECUTE $sql$
      UPDATE public.order_payment_transactions
      SET gateway_payment_id = COALESCE(NULLIF(gateway_payment_id, ''), gateway_reference)
      WHERE gateway_reference IS NOT NULL
        AND NULLIF(gateway_payment_id, '') IS NULL;
    $sql$;
  END IF;

  -- 1c. Move/backfill any gateway audit fields from checkout_groups -> order_payment_transactions
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'checkout_groups'
      AND column_name = 'payment_gateway_order_id'
  ) INTO has_cg_gateway_cols;

  IF has_cg_gateway_cols THEN
    EXECUTE $sql$
      UPDATE public.order_payment_transactions tx
      SET
        payment_gateway = COALESCE(NULLIF(tx.payment_gateway, ''), cg.payment_gateway),
        gateway_order_id = COALESCE(NULLIF(tx.gateway_order_id, ''), cg.payment_gateway_order_id),
        gateway_payment_id = COALESCE(NULLIF(tx.gateway_payment_id, ''), cg.payment_gateway_payment_id),
        gateway_signature = COALESCE(NULLIF(tx.gateway_signature, ''), cg.payment_gateway_signature),
        paid_at = COALESCE(tx.paid_at, cg.paid_at)
      FROM public.checkout_groups cg
      WHERE tx.checkout_group_id = cg.id
        AND (
          NULLIF(tx.payment_gateway, '') IS NULL
          OR NULLIF(tx.gateway_order_id, '') IS NULL
          OR NULLIF(tx.gateway_payment_id, '') IS NULL
          OR tx.gateway_signature IS NULL
          OR tx.paid_at IS NULL
        );

      -- Create initial ledger rows for any checkout_groups that had gateway/paid metadata without a tx row
      INSERT INTO public.order_payment_transactions (
        order_id,
        checkout_group_id,
        transaction_type,
        amount,
        payment_method,
        payment_gateway,
        status,
        gateway_order_id,
        gateway_payment_id,
        gateway_signature,
        idempotency_key,
        notes,
        paid_at,
        created_at
      )
      SELECT
        (
          SELECT o.id
          FROM public.orders o
          WHERE o.checkout_group_id = cg.id
          ORDER BY o.created_at ASC
          LIMIT 1
        ) AS order_id,
        cg.id AS checkout_group_id,
        'initial' AS transaction_type,
        GREATEST(0, COALESCE(cg.amount_paid, 0)) AS amount,
        COALESCE(NULLIF(cg.payment_method, ''), 'cod') AS payment_method,
        COALESCE(
          NULLIF(cg.payment_gateway, ''),
          CASE WHEN COALESCE(NULLIF(cg.payment_method, ''), 'cod') <> 'cod' THEN 'demo_gateway' ELSE 'cod' END
        ) AS payment_gateway,
        CASE
          WHEN cg.payment_status IN ('paid', 'partially_paid') OR COALESCE(cg.amount_paid, 0) > 0 THEN 'success'
          WHEN cg.payment_status = 'failed' THEN 'failed'
          WHEN cg.payment_status = 'refunded' THEN 'refunded'
          ELSE 'pending'
        END AS status,
        cg.payment_gateway_order_id AS gateway_order_id,
        cg.payment_gateway_payment_id AS gateway_payment_id,
        cg.payment_gateway_signature AS gateway_signature,
        CONCAT('backfill-init-', cg.id::text) AS idempotency_key,
        CONCAT('Backfilled checkout payment audit (', cg.checkout_reference, ')') AS notes,
        cg.paid_at AS paid_at,
        COALESCE(cg.created_at, TIMEZONE('utc'::text, NOW())) AS created_at
      FROM public.checkout_groups cg
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.order_payment_transactions tx
        WHERE tx.checkout_group_id = cg.id
      )
      AND (
        COALESCE(cg.amount_paid, 0) > 0
        OR cg.paid_at IS NOT NULL
        OR NULLIF(cg.payment_gateway_payment_id, '') IS NOT NULL
        OR NULLIF(cg.payment_gateway_signature, '') IS NOT NULL
      );
    $sql$;
  END IF;

  -- 1d. Preserve placed_at into created_at if created_at was ever null
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'placed_at'
  ) INTO has_orders_placed_at;

  IF has_orders_placed_at THEN
    EXECUTE $sql$
      UPDATE public.orders
      SET created_at = placed_at
      WHERE created_at IS NULL AND placed_at IS NOT NULL;
    $sql$;
  END IF;

  -- 1e. Preserve swad_coins_used into swad_coin_discount_amount (1 coin = ₹1)
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'swad_coins_used'
  ) INTO has_orders_swad_coins;

  IF has_orders_swad_coins THEN
    EXECUTE $sql$
      UPDATE public.orders
      SET swad_coin_discount_amount = GREATEST(
        COALESCE(swad_coin_discount_amount, 0),
        COALESCE(swad_coins_used, 0)
      )
      WHERE COALESCE(swad_coins_used, 0) > COALESCE(swad_coin_discount_amount, 0);
    $sql$;
  END IF;
END $$;

-- 2. Drop the 8 redundant / dead columns cleanly
ALTER TABLE IF EXISTS public.checkout_groups
  DROP COLUMN IF EXISTS payment_gateway,
  DROP COLUMN IF EXISTS payment_gateway_order_id,
  DROP COLUMN IF EXISTS payment_gateway_payment_id,
  DROP COLUMN IF EXISTS payment_gateway_signature,
  DROP COLUMN IF EXISTS paid_at;

ALTER TABLE IF EXISTS public.orders
  DROP COLUMN IF EXISTS placed_at,
  DROP COLUMN IF EXISTS swad_coins_used;

ALTER TABLE IF EXISTS public.order_payment_transactions
  DROP COLUMN IF EXISTS gateway_reference;

-- 3. Helpful lookup indexes for segregated payment ledger queries
CREATE INDEX IF NOT EXISTS idx_payment_tx_checkout_group_id
  ON public.order_payment_transactions(checkout_group_id);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order_id
  ON public.order_payment_transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_order_id
  ON public.payment_allocations(order_id);

-- 4. Unified read-only reconciliation view across checkout_groups, orders & order_payment_transactions
CREATE OR REPLACE VIEW public.v_checkout_transaction_summary AS
SELECT
  cg.id AS checkout_group_id,
  cg.checkout_reference,
  cg.customer_id,
  cg.customer_name,
  cg.customer_phone,
  cg.outlet_id,
  cg.order_mode,
  cg.payment_method,
  cg.payment_status,
  cg.coupon_code_snapshot,
  cg.subtotal,
  cg.discount_amount,
  cg.swad_coin_discount_amount,
  cg.packaging_fee,
  cg.delivery_charge,
  cg.tax_amount,
  cg.grand_total,
  cg.amount_due_now,
  cg.amount_paid,
  cg.balance_due,
  cg.delivery_pincode,
  cg.created_at,
  COALESCE(ord_agg.order_count, 0) AS order_count,
  COALESCE(ord_agg.order_numbers, ARRAY[]::TEXT[]) AS order_numbers,
  COALESCE(ord_agg.order_statuses, ARRAY[]::TEXT[]) AS order_statuses,
  COALESCE(tx_agg.transaction_count, 0) AS transaction_count,
  COALESCE(tx_agg.total_gateway_paid, 0) AS total_gateway_paid,
  tx_agg.latest_payment_gateway,
  tx_agg.latest_gateway_order_id,
  tx_agg.latest_gateway_payment_id,
  tx_agg.latest_paid_at
FROM public.checkout_groups cg
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS order_count,
    ARRAY_AGG(o.order_number ORDER BY o.created_at ASC) AS order_numbers,
    ARRAY_AGG(o.order_status::TEXT ORDER BY o.created_at ASC) AS order_statuses
  FROM public.orders o
  WHERE o.checkout_group_id = cg.id
) ord_agg ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS transaction_count,
    COALESCE(SUM(CASE WHEN tx.status = 'success' THEN tx.amount ELSE 0 END), 0) AS total_gateway_paid,
    (ARRAY_AGG(tx.payment_gateway ORDER BY tx.created_at DESC NULLS LAST) FILTER (WHERE tx.payment_gateway IS NOT NULL))[1] AS latest_payment_gateway,
    (ARRAY_AGG(tx.gateway_order_id ORDER BY tx.created_at DESC NULLS LAST) FILTER (WHERE tx.gateway_order_id IS NOT NULL))[1] AS latest_gateway_order_id,
    (ARRAY_AGG(tx.gateway_payment_id ORDER BY tx.created_at DESC NULLS LAST) FILTER (WHERE tx.gateway_payment_id IS NOT NULL))[1] AS latest_gateway_payment_id,
    MAX(tx.paid_at) AS latest_paid_at
  FROM public.order_payment_transactions tx
  WHERE tx.checkout_group_id = cg.id
     OR tx.order_id IN (SELECT o2.id FROM public.orders o2 WHERE o2.checkout_group_id = cg.id)
) tx_agg ON true;

DO $$
BEGIN
  ALTER VIEW public.v_checkout_transaction_summary SET (security_invoker = true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
