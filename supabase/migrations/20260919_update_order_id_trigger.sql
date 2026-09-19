-- Migration: Update generate_order_id trigger to use GKSWAD-00001 format without '#'
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 52;

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS TRIGGER AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF NEW.order_id IS NULL OR NEW.order_id = '' OR NEW.order_id LIKE 'temp-%' OR NEW.order_id NOT LIKE 'GKSWAD-%' OR NEW.order_id LIKE 'GKSWAD-#%' THEN
    seq_val := nextval('public.order_number_seq');
    NEW.order_id := 'GKSWAD-' || LPAD(seq_val::text, 5, '0');
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
