# Plan: Standardize on `outlets` Column & Remove Redundant `outlet_ids` from Products

Streamline the data model by removing the redundant `outlet_ids` column from `public.products` and standardizing on the rich `outlets` (`ProductOutletConfig[]`) column across the database, server, and client application, while leaving `public.coupons` untouched.

### User Review & Critical Decisions

- [x] **Scope Guard**: Confirmed and executed strictly for the `products` table and product-related logic. `public.coupons` remains completely untouched.
- [x] **Single Source of Truth**: The `outlets` JSONB column (`[{ outletId, inStock, portionsLeft, isFeatured, isBestseller, isChefSpecial }]`) is now the exclusive representation.
- [x] **Database Migration Safety**: Safe migration (`ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS outlet_ids;`) added to `supabase/schema.sql`.

---

### Implementation Summary

1. **`src/types.ts`**: Removed `outletIds?: string[]` from `Product` interface.
2. **`src/lib/supabaseService.ts`**:
   - `mapDbProductToProduct`: Removed reading `row.outlet_ids` and returning `outletIds`.
   - `mapProductToDbProduct`: Removed mapping `p.outletIds` to `dbObj.outlet_ids`.
   - `updateSupabaseOutletProductConfig` & `batchUpdateSupabaseOutletProducts`: Removed updating `outlet_ids`.
3. **`src/lib/locationService.ts`**:
   - `isProductServedAtOutlet`: Removed `product.outletIds` fallback; matches strictly using `product.outlets.some(o => o.outletId === outletId)`.
4. **`src/pages/owner/OwnerProductFormPage.tsx`**:
   - Initialized outlet configs directly from `product.outlets`.
   - Removed `outletIds` from the form submit payload.
5. **`src/pages/owner/OwnerProductsPage.tsx`**:
   - Filtered products by outlet strictly through `product.outlets`.
   - Removed `outletIds` from quick config save payload and metrics calculation.
6. **`server/storage.ts`**:
   - `getProductByOutlet`: Filters exclusively by `p.outlets`.
   - `createProduct` & `updateProduct`: Manages `outlets` without setting `outletIds`.
   - `createOutlet` & `deleteOutlet`: Modifies `p.outlets` array instead of `p.outletIds`.
7. **`supabase/schema.sql`**:
   - Removed `outlet_ids` column from `CREATE TABLE public.products`.
   - Added `ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS outlet_ids;` migration block.
8. **`src/components/CloudDatabaseStatus.tsx`**:
   - Removed `outlet_ids` from schema representation and added quick migration snippet.
