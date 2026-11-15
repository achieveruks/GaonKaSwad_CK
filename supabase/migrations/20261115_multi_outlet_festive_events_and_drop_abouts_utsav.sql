-- Migration: Multi-outlet Festival Collections (outlet_ids only) & Remove Obsolete Abouts Utsav Promo Columns

-- 1. Ensure outlet_ids TEXT[] exists on festive_events, backfill from legacy outlet_id if present, and drop duplicate outlet_id column
ALTER TABLE IF EXISTS public.festive_events
  ADD COLUMN IF NOT EXISTS outlet_ids TEXT[] NOT NULL DEFAULT '{}'::text[];

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'festive_events'
      AND column_name = 'outlet_id'
  ) THEN
    UPDATE public.festive_events
    SET outlet_ids = ARRAY[outlet_id]
    WHERE (outlet_ids IS NULL OR cardinality(outlet_ids) = 0)
      AND outlet_id IS NOT NULL
      AND outlet_id <> '';
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_festive_events_outlet;

ALTER TABLE IF EXISTS public.festive_events
  DROP COLUMN IF EXISTS outlet_id;

CREATE INDEX IF NOT EXISTS idx_festive_events_outlet_ids
  ON public.festive_events USING GIN (outlet_ids);

-- 2. Drop obsolete Utsav promotional columns from abouts table (festive_events is now single source of truth)
ALTER TABLE IF EXISTS public.abouts
  DROP COLUMN IF EXISTS utsav_promo_enabled,
  DROP COLUMN IF EXISTS utsav_promo_heading,
  DROP COLUMN IF EXISTS utsav_promo_description,
  DROP COLUMN IF EXISTS utsav_promo_cta_text,
  DROP COLUMN IF EXISTS utsav_promo_image,
  DROP COLUMN IF EXISTS utsav_festival_name;
