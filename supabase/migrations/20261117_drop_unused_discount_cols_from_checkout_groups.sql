-- ==============================================================================
-- MIGRATION: Drop unused discount & legacy welcome columns from checkout_groups
-- Date: 2026-11-17
-- Verified:
--   - All 34 live checkout_groups rows have discount_description = NULL,
--     welcome_discount_applied = false, welcome_discount_amount = 0.
--   - discount_type ('coupon' | 'NONE') is redundant with coupon_id / coupon_code_snapshot / discount_amount.
--   - Promo discounts (including WELCOME51) are stored in coupon_id, coupon_code_snapshot,
--     discount_amount, and coupon_redemptions.
-- ==============================================================================

ALTER TABLE IF EXISTS public.checkout_groups
  DROP COLUMN IF EXISTS discount_type,
  DROP COLUMN IF EXISTS discount_description,
  DROP COLUMN IF EXISTS welcome_discount_applied,
  DROP COLUMN IF EXISTS welcome_discount_amount;

ALTER TABLE IF EXISTS public.orders
  DROP COLUMN IF EXISTS discount_type,
  DROP COLUMN IF EXISTS discount_description,
  DROP COLUMN IF EXISTS welcome_discount_applied,
  DROP COLUMN IF EXISTS welcome_discount_amount;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
