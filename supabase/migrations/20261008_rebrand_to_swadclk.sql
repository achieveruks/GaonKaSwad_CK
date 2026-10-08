-- Migration: Rebrand order ID format and database tables to Swad Click
-- Updates existing orders, rewards, transactions, outlets, abouts, and trigger function.

-- 1. Update existing orders
UPDATE public.orders
SET order_id = REPLACE(order_id, 'GKSWAD-', 'SWADCLK-'),
    order_number = REPLACE(order_number, 'GKSWAD-', 'SWADCLK-')
WHERE order_id LIKE 'GKSWAD-%' OR order_number LIKE 'GKSWAD-%';

-- 2. Update swad_coin_rewards
UPDATE public.swad_coin_rewards
SET order_id = REPLACE(order_id, 'GKSWAD-', 'SWADCLK-')
WHERE order_id LIKE 'GKSWAD-%';

-- 3. Update swad_coin_transactions
UPDATE public.swad_coin_transactions
SET order_id = REPLACE(order_id, 'GKSWAD-', 'SWADCLK-')
WHERE order_id LIKE 'GKSWAD-%';

-- 4. Update outlets table
UPDATE public.outlets
SET name = REPLACE(name, 'Gaon Ka Swad', 'Swad Click'),
    email = REGEXP_REPLACE(email, '@gaonkaswad\.(com|in)', '@swadclick.com', 'gi')
WHERE name LIKE '%Gaon Ka Swad%' OR email LIKE '%@gaonkaswad%';

-- 5. Update abouts table
UPDATE public.abouts
SET hero_fire_line = REPLACE(hero_fire_line, 'GAON KA SWAD', 'SWAD CLICK'),
    exp_line = REPLACE(exp_line, 'GAON KA SWAD', 'SWAD CLICK'),
    story_description = REPLACE(story_description, 'Gaon Ka Swad', 'Swad Click'),
    exp_card3_description = REPLACE(exp_card3_description, 'Gaon Ka Swad', 'Swad Click')
WHERE hero_fire_line LIKE '%GAON KA SWAD%'
   OR exp_line LIKE '%GAON KA SWAD%'
   OR story_description LIKE '%Gaon Ka Swad%'
   OR exp_card3_description LIKE '%Gaon Ka Swad%';

-- 6. Update order number sequence and trigger function
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 16;

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF NEW.order_id IS NULL OR NEW.order_id = '' OR NEW.order_id LIKE 'temp-%' OR NEW.order_id NOT LIKE 'SWADCLK-%' OR NEW.order_id LIKE 'SWADCLK-#%' THEN
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
