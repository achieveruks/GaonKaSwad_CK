-- ==============================================================================
-- MIGRATION / ONE-TIME CLEANUP: Remove all stale orders, payments & coin data
-- before SWADCLK-00031 (including legacy test orders & orphan SWADCLK-00016).
-- Safe, atomic transaction with Swad Coin balance & sequence reconciliation.
-- ==============================================================================

BEGIN;

-- 1. Identify all target orders & checkout_groups strictly before SWADCLK-00031
CREATE TEMP TABLE _cleanup_target_orders ON COMMIT DROP AS
SELECT id, order_number, checkout_group_id
FROM public.orders
WHERE order_number IN ('SWADCLK-TEST-999', 'SWADCLK-VERIFY-01')
   OR (
     order_number ~ '^(?:SWADCLK|GKSWAD)-#?0*[0-9]+'
     AND ((REGEXP_MATCH(order_number, '^(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1])::BIGINT < 31
   );

CREATE TEMP TABLE _cleanup_target_groups ON COMMIT DROP AS
SELECT id, checkout_reference
FROM public.checkout_groups
WHERE id IN (
    SELECT checkout_group_id
    FROM _cleanup_target_orders
    WHERE checkout_group_id IS NOT NULL
  )
  OR checkout_reference IN ('SWADCLK-TEST-999', 'SWADCLK-VERIFY-01')
  OR (
    checkout_reference ~ '^(?:SWADCLK|GKSWAD)-#?0*[0-9]+'
    AND ((REGEXP_MATCH(checkout_reference, '^(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1])::BIGINT < 31
  );

CREATE TEMP TABLE _cleanup_target_rewards ON COMMIT DROP AS
SELECT id, order_id
FROM public.swad_coin_rewards
WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
   OR order_id IN (SELECT order_number FROM _cleanup_target_orders)
   OR (
     order_id ~ '^(?:SWADCLK|GKSWAD)-#?0*[0-9]+'
     AND ((REGEXP_MATCH(order_id, '^(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1])::BIGINT < 31
   );

-- 2. Delete payment allocations & payment transactions linked to target orders/groups
DELETE FROM public.payment_allocations
WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
   OR payment_transaction_id IN (
     SELECT id
     FROM public.order_payment_transactions
     WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
        OR checkout_group_id IN (SELECT id FROM _cleanup_target_groups)
   );

DELETE FROM public.order_payment_transactions
WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
   OR checkout_group_id IN (SELECT id FROM _cleanup_target_groups);

-- 3. Delete Swad Coin transactions, rewards & legacy dispatch runs for pre-00031 orders
DELETE FROM public.swad_coin_transactions
WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
   OR order_id IN (SELECT order_number FROM _cleanup_target_orders)
   OR reward_id IN (SELECT id FROM _cleanup_target_rewards)
   OR (
     order_id ~ '^(?:SWADCLK|GKSWAD)-#?0*[0-9]+'
     AND ((REGEXP_MATCH(order_id, '^(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1])::BIGINT < 31
   );

DELETE FROM public.swad_coin_rewards
WHERE id IN (SELECT id FROM _cleanup_target_rewards);

DELETE FROM public.swad_coins_dispatch
WHERE run_at < '2026-10-08T00:00:00Z';

-- 4. Delete coupon redemptions & product reviews tied to pre-00031 orders
DELETE FROM public.coupon_redemptions
WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
   OR order_id IN (SELECT order_number FROM _cleanup_target_orders)
   OR checkout_group_id IN (SELECT id FROM _cleanup_target_groups)
   OR (checkout_group_id IS NULL AND created_at < '2026-10-08T00:00:00Z');

DELETE FROM public.product_reviews
WHERE order_id IN (SELECT id FROM _cleanup_target_orders)
   OR order_id IN (SELECT order_number FROM _cleanup_target_orders);

-- 5. Delete child order_items, orders & checkout_groups
DELETE FROM public.order_items
WHERE order_id IN (SELECT id FROM _cleanup_target_orders);

DELETE FROM public.orders
WHERE id IN (SELECT id FROM _cleanup_target_orders);

DELETE FROM public.checkout_groups
WHERE id IN (SELECT id FROM _cleanup_target_groups);

-- 6. Recompute every customer's swad_coin_balance cleanly from remaining ledger rows
UPDATE public.customers c
SET swad_coin_balance = GREATEST(
      0,
      COALESCE((
        SELECT SUM(t.amount)::INTEGER
        FROM public.swad_coin_transactions t
        WHERE t.customer_id = c.id
      ), 0)
    ),
    updated_at = NOW();

-- 7. Keep order_number_seq safely >= 31 (and >= highest existing order/group number)
DO $$
DECLARE
  max_order_seq BIGINT := 30;
  max_group_seq BIGINT := 30;
  final_seq BIGINT := 30;
BEGIN
  SELECT COALESCE(
    MAX((REGEXP_MATCH(order_number, '(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1]::BIGINT),
    30
  )
  INTO max_order_seq
  FROM public.orders
  WHERE order_number ~ '(?:SWADCLK|GKSWAD)-#?0*[0-9]+';

  SELECT COALESCE(
    MAX((REGEXP_MATCH(checkout_reference, '(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1]::BIGINT),
    30
  )
  INTO max_group_seq
  FROM public.checkout_groups
  WHERE checkout_reference ~ '(?:SWADCLK|GKSWAD)-#?0*[0-9]+';

  final_seq := GREATEST(max_order_seq, max_group_seq, 30);
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'order_number_seq') THEN
    PERFORM setval('public.order_number_seq', final_seq, true);
  END IF;
END $$;

COMMIT;
