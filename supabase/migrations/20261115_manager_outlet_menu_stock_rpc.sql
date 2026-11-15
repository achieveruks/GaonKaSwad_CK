-- ==============================================================================
-- MIGRATION: Allow Outlet Managers to update outlet-specific menu & stock
-- safely via scoped SECURITY DEFINER RPCs and multi-outlet helper
-- Date: 2026-11-15
-- ==============================================================================

-- 1. Ensure multi-outlet assignment column exists on profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS assigned_outlet_ids TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Helper: Check whether the authenticated user manages the given outlet
CREATE OR REPLACE FUNCTION public.is_outlet_manager_for(p_outlet_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND LOWER(COALESCE(pr.role, '')) IN ('outlet_manager', 'manager')
      AND (
        pr.outlet_id = p_outlet_id
        OR p_outlet_id = ANY(COALESCE(pr.assigned_outlet_ids, ARRAY[]::TEXT[]))
      )
  );
$$;

-- 3. Update Outlets Modify Policy to also support multi-outlet managers
DROP POLICY IF EXISTS "Outlets Modify Policy" ON public.outlets;
CREATE POLICY "Outlets Modify Policy" ON public.outlets
  FOR ALL USING (
    public.is_owner()
    OR public.is_outlet_manager_for(id)
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    public.is_owner()
    OR public.is_outlet_manager_for(id)
    OR auth.uid() IS NULL
  );

-- 4. Scoped RPC: Update a single product's configuration for one outlet
CREATE OR REPLACE FUNCTION public.update_outlet_product_config(
  p_outlet_id TEXT,
  p_product_id TEXT,
  p_config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
  v_outlets JSONB;
  v_existing JSONB;
  v_filtered JSONB;
  v_new_outlets JSONB;
  v_is_assigned BOOLEAN;
  v_in_stock BOOLEAN;
  v_is_featured BOOLEAN;
  v_is_bestseller BOOLEAN;
  v_is_chef_special BOOLEAN;
  v_portions_left INTEGER;
  v_entry JSONB;
  v_updated_row public.products%ROWTYPE;
BEGIN
  IF NOT (auth.uid() IS NULL OR public.is_owner() OR public.is_outlet_manager_for(p_outlet_id)) THEN
    RAISE EXCEPTION 'Not authorized to manage menu for outlet %', p_outlet_id
      USING ERRCODE = '42501';
  END IF;

  SELECT outlets INTO v_outlets
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  v_outlets := COALESCE(v_outlets, '[]'::jsonb);

  SELECT elem INTO v_existing
  FROM jsonb_array_elements(v_outlets) AS elem
  WHERE elem->>'outletId' = p_outlet_id
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_filtered
  FROM jsonb_array_elements(v_outlets) AS elem
  WHERE elem->>'outletId' IS DISTINCT FROM p_outlet_id;

  v_is_assigned := CASE
    WHEN p_config ? 'isAssigned' AND jsonb_typeof(p_config->'isAssigned') = 'boolean'
      THEN (p_config->>'isAssigned')::BOOLEAN
    ELSE true
  END;

  IF NOT v_is_assigned THEN
    v_new_outlets := v_filtered;
  ELSE
    v_in_stock := CASE
      WHEN p_config ? 'inStock' AND jsonb_typeof(p_config->'inStock') = 'boolean'
        THEN (p_config->>'inStock')::BOOLEAN
      ELSE COALESCE((v_existing->>'inStock')::BOOLEAN, true)
    END;
    v_is_featured := CASE
      WHEN p_config ? 'isFeatured' AND jsonb_typeof(p_config->'isFeatured') = 'boolean'
        THEN (p_config->>'isFeatured')::BOOLEAN
      ELSE COALESCE((v_existing->>'isFeatured')::BOOLEAN, false)
    END;
    v_is_bestseller := CASE
      WHEN p_config ? 'isBestseller' AND jsonb_typeof(p_config->'isBestseller') = 'boolean'
        THEN (p_config->>'isBestseller')::BOOLEAN
      ELSE COALESCE((v_existing->>'isBestseller')::BOOLEAN, false)
    END;
    v_is_chef_special := CASE
      WHEN p_config ? 'isChefSpecial' AND jsonb_typeof(p_config->'isChefSpecial') = 'boolean'
        THEN (p_config->>'isChefSpecial')::BOOLEAN
      ELSE COALESCE((v_existing->>'isChefSpecial')::BOOLEAN, false)
    END;
    v_portions_left := CASE
      WHEN p_config ? 'portionsLeft' THEN
        CASE
          WHEN jsonb_typeof(p_config->'portionsLeft') = 'null'
            OR NULLIF(BTRIM(COALESCE(p_config->>'portionsLeft', '')), '') IS NULL
            THEN NULL
          ELSE (p_config->>'portionsLeft')::INTEGER
        END
      WHEN v_existing IS NOT NULL AND (v_existing ? 'portionsLeft') AND jsonb_typeof(v_existing->'portionsLeft') <> 'null'
        THEN (v_existing->>'portionsLeft')::INTEGER
      ELSE NULL
    END;

    v_entry := jsonb_build_object(
      'outletId', p_outlet_id,
      'inStock', v_in_stock,
      'isFeatured', v_is_featured,
      'isBestseller', v_is_bestseller,
      'isChefSpecial', v_is_chef_special,
      'portionsLeft', CASE WHEN v_portions_left IS NULL THEN 'null'::jsonb ELSE to_jsonb(v_portions_left) END
    );
    v_new_outlets := v_filtered || jsonb_build_array(v_entry);
  END IF;

  UPDATE public.products
  SET outlets = v_new_outlets,
      updated_at = v_now
  WHERE id = p_product_id
  RETURNING * INTO v_updated_row;

  -- Sync active (non-empty) assigned_product_ids on the outlet if applicable
  IF p_config ? 'isAssigned' AND jsonb_typeof(p_config->'isAssigned') = 'boolean' THEN
    UPDATE public.outlets
    SET assigned_product_ids = CASE
      WHEN jsonb_typeof(assigned_product_ids) <> 'array' OR jsonb_array_length(assigned_product_ids) = 0
        THEN assigned_product_ids
      WHEN v_is_assigned THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(assigned_product_ids) x WHERE x = p_product_id)
            THEN assigned_product_ids
          ELSE assigned_product_ids || to_jsonb(p_product_id)
        END
      ELSE
        COALESCE(
          (SELECT jsonb_agg(x) FROM jsonb_array_elements_text(assigned_product_ids) x WHERE x <> p_product_id),
          '[]'::jsonb
        )
    END,
    updated_at = v_now
    WHERE id = p_outlet_id;
  END IF;

  RETURN to_jsonb(v_updated_row);
END;
$$;

-- 5. Scoped RPC: Atomically batch-update menu & stock for one outlet
CREATE OR REPLACE FUNCTION public.batch_update_outlet_products(
  p_outlet_id TEXT,
  p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
  v_item JSONB;
  v_product_id TEXT;
  v_outlets JSONB;
  v_existing JSONB;
  v_filtered JSONB;
  v_new_outlets JSONB;
  v_is_assigned BOOLEAN;
  v_in_stock BOOLEAN;
  v_is_featured BOOLEAN;
  v_is_bestseller BOOLEAN;
  v_is_chef_special BOOLEAN;
  v_portions_left INTEGER;
  v_entry JSONB;
  v_assigned_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT (auth.uid() IS NULL OR public.is_owner() OR public.is_outlet_manager_for(p_outlet_id)) THEN
    RAISE EXCEPTION 'Not authorized to manage menu for outlet %', p_outlet_id
      USING ERRCODE = '42501';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_updates, '[]'::jsonb))
  LOOP
    v_product_id := v_item->>'productId';
    IF v_product_id IS NULL OR v_product_id = '' THEN
      CONTINUE;
    END IF;

    SELECT outlets INTO v_outlets
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_outlets := COALESCE(v_outlets, '[]'::jsonb);

    SELECT elem INTO v_existing
    FROM jsonb_array_elements(v_outlets) AS elem
    WHERE elem->>'outletId' = p_outlet_id
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_filtered
    FROM jsonb_array_elements(v_outlets) AS elem
    WHERE elem->>'outletId' IS DISTINCT FROM p_outlet_id;

    v_is_assigned := CASE
      WHEN v_item ? 'isAssigned' AND jsonb_typeof(v_item->'isAssigned') = 'boolean'
        THEN (v_item->>'isAssigned')::BOOLEAN
      ELSE true
    END;

    IF NOT v_is_assigned THEN
      v_new_outlets := v_filtered;
    ELSE
      v_assigned_ids := array_append(v_assigned_ids, v_product_id);

      v_in_stock := CASE
        WHEN v_item ? 'inStock' AND jsonb_typeof(v_item->'inStock') = 'boolean'
          THEN (v_item->>'inStock')::BOOLEAN
        ELSE COALESCE((v_existing->>'inStock')::BOOLEAN, true)
      END;
      v_is_featured := CASE
        WHEN v_item ? 'isFeatured' AND jsonb_typeof(v_item->'isFeatured') = 'boolean'
          THEN (v_item->>'isFeatured')::BOOLEAN
        ELSE COALESCE((v_existing->>'isFeatured')::BOOLEAN, false)
      END;
      v_is_bestseller := CASE
        WHEN v_item ? 'isBestseller' AND jsonb_typeof(v_item->'isBestseller') = 'boolean'
          THEN (v_item->>'isBestseller')::BOOLEAN
        ELSE COALESCE((v_existing->>'isBestseller')::BOOLEAN, false)
      END;
      v_is_chef_special := CASE
        WHEN v_item ? 'isChefSpecial' AND jsonb_typeof(v_item->'isChefSpecial') = 'boolean'
          THEN (v_item->>'isChefSpecial')::BOOLEAN
        ELSE COALESCE((v_existing->>'isChefSpecial')::BOOLEAN, false)
      END;
      v_portions_left := CASE
        WHEN v_item ? 'portionsLeft' THEN
          CASE
            WHEN jsonb_typeof(v_item->'portionsLeft') = 'null'
              OR NULLIF(BTRIM(COALESCE(v_item->>'portionsLeft', '')), '') IS NULL
              THEN NULL
            ELSE (v_item->>'portionsLeft')::INTEGER
          END
        WHEN v_existing IS NOT NULL AND (v_existing ? 'portionsLeft') AND jsonb_typeof(v_existing->'portionsLeft') <> 'null'
          THEN (v_existing->>'portionsLeft')::INTEGER
        ELSE NULL
      END;

      v_entry := jsonb_build_object(
        'outletId', p_outlet_id,
        'inStock', v_in_stock,
        'isFeatured', v_is_featured,
        'isBestseller', v_is_bestseller,
        'isChefSpecial', v_is_chef_special,
        'portionsLeft', CASE WHEN v_portions_left IS NULL THEN 'null'::jsonb ELSE to_jsonb(v_portions_left) END
      );
      v_new_outlets := v_filtered || jsonb_build_array(v_entry);
    END IF;

    IF v_new_outlets IS DISTINCT FROM v_outlets THEN
      UPDATE public.products
      SET outlets = v_new_outlets,
          updated_at = v_now
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  UPDATE public.outlets
  SET assigned_product_ids = to_jsonb(v_assigned_ids),
      updated_at = v_now
  WHERE id = p_outlet_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_outlet_product_config(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_outlet_product_config(TEXT, TEXT, JSONB) TO authenticated, anon, service_role;

REVOKE ALL ON FUNCTION public.batch_update_outlet_products(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_update_outlet_products(TEXT, JSONB) TO authenticated, anon, service_role;
