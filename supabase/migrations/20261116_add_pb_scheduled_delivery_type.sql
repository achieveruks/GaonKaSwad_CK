-- ==============================================================================
-- MIGRATION: Add 'pb-scheduled' delivery_type for Utsav Pre-book orders and
-- backfill existing prebook and normal pickup rows.
-- Date: 2026-11-16
-- ==============================================================================

-- 1. Backfill all existing Utsav Pre-book orders to delivery_type = 'pb-scheduled'
UPDATE public.orders
SET
  delivery_type = 'pb-scheduled',
  customer_details = CASE
    WHEN jsonb_typeof(customer_details) = 'object'
      THEN jsonb_set(customer_details, '{deliveryType}', '"pb-scheduled"'::jsonb, true)
    ELSE customer_details
  END,
  updated_at = TIMEZONE('utc'::text, NOW())
WHERE (
  LOWER(COALESCE(order_type, '')) = 'prebook'
  OR festive_event_id IS NOT NULL
)
  AND COALESCE(delivery_type, '') <> 'pb-scheduled';

-- 2. Normalize existing non-prebook Self-Pickup orders to delivery_type = 'immediate'
UPDATE public.orders
SET
  delivery_type = 'immediate',
  scheduled_at = NULL,
  customer_details = CASE
    WHEN jsonb_typeof(customer_details) = 'object'
      THEN jsonb_set(customer_details, '{deliveryType}', '"immediate"'::jsonb, true)
    ELSE customer_details
  END,
  updated_at = TIMEZONE('utc'::text, NOW())
WHERE (
  LOWER(COALESCE(order_type, '')) = 'pickup'
  OR COALESCE(is_self_pickup, false) = true
)
  AND LOWER(COALESCE(order_type, '')) <> 'prebook'
  AND festive_event_id IS NULL
  AND COALESCE(delivery_type, '') <> 'immediate';
