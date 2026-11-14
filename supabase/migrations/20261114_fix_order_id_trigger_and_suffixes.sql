-- Migration: Fix Order ID Trigger & Align Child Order Suffixes (-I / -PB) with Checkout Reference
-- Root cause addressed:
--   Legacy trg_generate_order_id checked `NEW.order_id NOT LIKE 'GKSWAD-%'`, overwriting
--   SWADCLK-* child orders with fresh GKSWAD-000XX sequence IDs (e.g. GKSWAD-00040, GKSWAD-00041, GKSWAD-00043).
-- Target convention:
--   - checkout_groups.checkout_reference = SWADCLK-000XX
--   - Normal / Instant child order       = SWADCLK-000XX-I
--   - Pre-book child order (mixed/only)  = SWADCLK-000XX-PB

-- 1. Replace trigger function to accept SWADCLK-000XX, SWADCLK-000XX-I, SWADCLK-000XX-PB
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 16 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF NEW.order_id IS NULL
     OR BTRIM(NEW.order_id) = ''
     OR NEW.order_id LIKE 'temp-%'
     OR NEW.order_id LIKE 'SWADCLK-#%'
     OR NEW.order_id !~ '^SWADCLK-[0-9]+(-I|-PB)?$'
  THEN
    seq_val := nextval('public.order_number_seq');
    NEW.order_id := 'SWADCLK-' || LPAD(seq_val::text, 5, '0');
  END IF;

  NEW.order_number := NEW.order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_id ON public.orders;
CREATE TRIGGER trg_generate_order_id
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_id();

-- 2. Repair existing orders linked to checkout_groups (e.g. GKSWAD-00040 -> SWADCLK-00039-I,
--    GKSWAD-00041 -> SWADCLK-00039-PB, GKSWAD-00043 -> SWADCLK-00042-I, *_PB -> *-PB)
--    Step 2a: Temporarily move mismatched order_id/order_number only if a target value already exists
--    on another row (prevents unique constraint conflicts during update).
DO $$
DECLARE
  rec RECORD;
  target_id TEXT;
BEGIN
  FOR rec IN
    SELECT
      o.id,
      o.order_id,
      o.order_number,
      o.order_type,
      cg.checkout_reference
    FROM public.orders o
    JOIN public.checkout_groups cg ON cg.id = o.checkout_group_id
    WHERE cg.checkout_reference IS NOT NULL
      AND cg.checkout_reference ~ '^SWADCLK-[0-9]+$'
  LOOP
    IF LOWER(COALESCE(rec.order_type, '')) = 'prebook' THEN
      target_id := rec.checkout_reference || '-PB';
    ELSE
      target_id := rec.checkout_reference || '-I';
    END IF;

    IF rec.order_id IS DISTINCT FROM target_id OR rec.order_number IS DISTINCT FROM target_id THEN
      -- Clear any rare collision on legacy unlinked row if needed (none expected with -I/-PB suffix)
      IF NOT EXISTS (
        SELECT 1 FROM public.orders other
        WHERE other.id <> rec.id
          AND (other.order_id = target_id OR other.order_number = target_id)
      ) THEN
        UPDATE public.orders
        SET order_id = target_id,
            order_number = target_id,
            updated_at = NOW()
        WHERE id = rec.id;

        -- Sync any text references in swad_coin_transactions if stored by old order_id string
        UPDATE public.swad_coin_transactions
        SET order_id = target_id
        WHERE order_id = rec.order_id;

        UPDATE public.swad_coin_rewards
        SET order_id = target_id
        WHERE order_id = rec.order_id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3. Repair any remaining legacy GKSWAD-* rows in orders/rewards/transactions without collisions
UPDATE public.orders o
SET order_id = REGEXP_REPLACE(o.order_id, '^GKSWAD-#?', 'SWADCLK-'),
    order_number = REGEXP_REPLACE(COALESCE(o.order_number, o.order_id), '^GKSWAD-#?', 'SWADCLK-'),
    updated_at = NOW()
WHERE (o.order_id LIKE 'GKSWAD-%' OR o.order_number LIKE 'GKSWAD-%')
  AND NOT EXISTS (
    SELECT 1 FROM public.orders other
    WHERE other.id <> o.id
      AND (
        other.order_id = REGEXP_REPLACE(o.order_id, '^GKSWAD-#?', 'SWADCLK-')
        OR other.order_number = REGEXP_REPLACE(COALESCE(o.order_number, o.order_id), '^GKSWAD-#?', 'SWADCLK-')
      )
  );

UPDATE public.swad_coin_rewards
SET order_id = REGEXP_REPLACE(order_id, '^GKSWAD-#?', 'SWADCLK-')
WHERE order_id LIKE 'GKSWAD-%';

UPDATE public.swad_coin_transactions
SET order_id = REGEXP_REPLACE(order_id, '^GKSWAD-#?', 'SWADCLK-')
WHERE order_id LIKE 'GKSWAD-%';

-- 4. Normalize any legacy _PB underscore suffixes in orders & payment transaction notes
UPDATE public.orders
SET order_id = REGEXP_REPLACE(order_id, '_PB$', '-PB'),
    order_number = REGEXP_REPLACE(order_number, '_PB$', '-PB'),
    updated_at = NOW()
WHERE order_id LIKE '%_PB' OR order_number LIKE '%_PB';

UPDATE public.order_payment_transactions
SET notes = REGEXP_REPLACE(notes, '_PB', '-PB', 'g')
WHERE notes LIKE '%_PB%';

-- 5. Resync public.order_number_seq past the highest existing sequence across checkout_groups & orders
DO $$
DECLARE
  max_order_seq BIGINT := 15;
  max_group_seq BIGINT := 15;
  final_seq BIGINT := 15;
BEGIN
  SELECT COALESCE(
    MAX((REGEXP_MATCH(order_id, '(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1]::BIGINT),
    15
  )
  INTO max_order_seq
  FROM public.orders
  WHERE order_id ~ '(?:SWADCLK|GKSWAD)-#?0*[0-9]+';

  SELECT COALESCE(
    MAX((REGEXP_MATCH(checkout_reference, '(?:SWADCLK|GKSWAD)-#?0*([0-9]+)'))[1]::BIGINT),
    15
  )
  INTO max_group_seq
  FROM public.checkout_groups
  WHERE checkout_reference ~ '(?:SWADCLK|GKSWAD)-#?0*[0-9]+';

  final_seq := GREATEST(max_order_seq, max_group_seq, 15);
  PERFORM setval('public.order_number_seq', final_seq, true);
END $$;
