-- ==============================================================================
-- MIGRATION: Pre-book Advance Refund Allocation Type & Summary View Metric
-- Date: 2026-11-18
-- Summary:
--   1. Expands public.payment_allocations.allocation_type CHECK constraint to
--      include 'prebook_refund' and 'refund' alongside existing split types.
--   2. Updates public.v_checkout_transaction_summary to expose total_refunded
--      so financial reconciliation includes cancelled Pre-book advance returns.
-- ==============================================================================

-- 1. Allow 'prebook_refund' and 'refund' in payment_allocations ledger
ALTER TABLE IF EXISTS public.payment_allocations
  DROP CONSTRAINT IF EXISTS payment_allocations_allocation_type_check;

ALTER TABLE IF EXISTS public.payment_allocations
  ADD CONSTRAINT payment_allocations_allocation_type_check
  CHECK (
    allocation_type IN (
      'normal_full',
      'prebook_advance',
      'prebook_full',
      'prebook_balance',
      'prebook_refund',
      'refund'
    )
  );

-- 2. Extend unified summary view with total_refunded metric
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
  COALESCE(tx_agg.total_refunded, 0) AS total_refunded,
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
    COALESCE(SUM(CASE WHEN tx.status = 'success' AND tx.transaction_type <> 'refund' THEN tx.amount ELSE 0 END), 0) AS total_gateway_paid,
    COALESCE(SUM(CASE WHEN tx.transaction_type = 'refund' OR tx.status = 'refunded' THEN tx.amount ELSE 0 END), 0) AS total_refunded,
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

NOTIFY pgrst, 'reload schema';
