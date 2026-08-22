import { supabase, isSupabaseConfigured } from './supabase';
import { Product, Outlet, OutletAbout, DeliveryZone, Order, Category, DashboardStats, Profile, UserRole, Customer, CustomerAddress } from '../types';
import { PRODUCTS as INITIAL_PRODUCTS, CATEGORIES as INITIAL_CATEGORIES } from '../data/products';
import { INITIAL_OUTLETS, INITIAL_DELIVERY_ZONES } from '../data/outlets';
import { INITIAL_OUTLET_ABOUTS, DEFAULT_OUTLET_ABOUT } from '../data/abouts';

// ============================================================================
// DATA MAPPERS (Database Snake_case <-> TypeScript CamelCase)
// ============================================================================

export function mapDbProductToProduct(row: any): Product {
  const outlets = Array.isArray(row.outlets) ? row.outlets : [];
  const outletIds = Array.isArray(row.outlet_ids) ? row.outlet_ids : [];

  return {
    id: row.id,
    name: row.name,
    hindiName: row.hindi_name || undefined,
    slug: row.slug,
    shortDescription: row.short_description || '',
    description: row.description || '',
    story: row.story || undefined,
    culinaryTitle: row.culinary_title || undefined,
    cookingMethodTitle: row.cooking_method_title || undefined,
    cookingMethodDesc: row.cooking_method_desc || undefined,
    aromaTitle: row.aroma_title || undefined,
    aromaDesc: row.aroma_desc || undefined,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    category: row.category,
    rating: row.rating !== undefined && row.rating !== null ? Number(row.rating) : 4.8,
    reviewsCount: row.reviews_count !== undefined && row.reviews_count !== null ? Number(row.reviews_count) : (Array.isArray(row.reviews_list) ? row.reviews_list.length : 0),
    image: row.image,
    galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : [row.image],
    isVeg: row.is_veg !== false,
    isJainFriendly: !!row.is_jain_friendly,
    spiceLevel: row.spice_level || 'Medium',
    prepTimeMinutes: row.prep_time_minutes ? Number(row.prep_time_minutes) : 30,
    serves: row.serves || 'Serves 1-2',
    calories: row.calories ? Number(row.calories) : undefined,
    active: row.active !== false,
    inStock: outlets.length > 0 ? outlets.some((o: any) => o.inStock) : true,
    outlets,
    outletIds,
    variants: Array.isArray(row.variants) ? row.variants : [],
    addons: Array.isArray(row.addons) ? row.addons : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    reviewsList: Array.isArray(row.reviews_list) ? row.reviews_list : [],
  };
}

export function mapProductToDbProduct(p: Partial<Product>): any {
  const dbObj: any = {};
  if (p.id !== undefined) dbObj.id = String(p.id);
  if (p.name !== undefined) dbObj.name = p.name.trim();
  if (p.hindiName !== undefined) dbObj.hindi_name = p.hindiName ? p.hindiName.trim() : null;
  if (p.slug !== undefined) dbObj.slug = p.slug.toLowerCase().trim();
  if (p.shortDescription !== undefined) dbObj.short_description = p.shortDescription.trim();
  if (p.description !== undefined) dbObj.description = p.description.trim();
  if (p.story !== undefined) dbObj.story = p.story ? p.story.trim() : null;
  if (p.culinaryTitle !== undefined) dbObj.culinary_title = p.culinaryTitle ? p.culinaryTitle.trim() : null;
  if (p.cookingMethodTitle !== undefined) dbObj.cooking_method_title = p.cookingMethodTitle ? p.cookingMethodTitle.trim() : null;
  if (p.cookingMethodDesc !== undefined) dbObj.cooking_method_desc = p.cookingMethodDesc ? p.cookingMethodDesc.trim() : null;
  if (p.aromaTitle !== undefined) dbObj.aroma_title = p.aromaTitle ? p.aromaTitle.trim() : null;
  if (p.aromaDesc !== undefined) dbObj.aroma_desc = p.aromaDesc ? p.aromaDesc.trim() : null;
  if (p.price !== undefined) dbObj.price = Number(p.price);
  if (p.originalPrice !== undefined) dbObj.original_price = p.originalPrice ? Number(p.originalPrice) : null;
  if (p.category !== undefined) dbObj.category = p.category;
  if (p.rating !== undefined) dbObj.rating = Number(p.rating);
  if (p.reviewsCount !== undefined) dbObj.reviews_count = Number(p.reviewsCount);
  if (p.image !== undefined) dbObj.image = p.image.trim();
  if (p.galleryImages !== undefined) dbObj.gallery_images = p.galleryImages;
  if (p.isVeg !== undefined) dbObj.is_veg = !!p.isVeg;
  if (p.isJainFriendly !== undefined) dbObj.is_jain_friendly = !!p.isJainFriendly;
  if (p.spiceLevel !== undefined) dbObj.spice_level = p.spiceLevel;
  if (p.prepTimeMinutes !== undefined) dbObj.prep_time_minutes = Number(p.prepTimeMinutes);
  if (p.serves !== undefined) dbObj.serves = p.serves;
  if (p.calories !== undefined) dbObj.calories = p.calories ? Number(p.calories) : null;
  if (p.active !== undefined) dbObj.active = !!p.active;
  if (p.outlets !== undefined) dbObj.outlets = p.outlets;
  if (p.outletIds !== undefined) dbObj.outlet_ids = p.outletIds;
  if (p.variants !== undefined) dbObj.variants = p.variants;
  if (p.addons !== undefined) dbObj.addons = p.addons;
  if (p.ingredients !== undefined) dbObj.ingredients = p.ingredients;
  if (p.allergens !== undefined) dbObj.allergens = p.allergens;
  if (p.reviewsList !== undefined) dbObj.reviews_list = p.reviewsList;
  dbObj.updated_at = new Date().toISOString();
  return dbObj;
}

export function mapDbOutletToOutlet(row: any): Outlet {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state || undefined,
    address: row.address,
    phone: row.phone || undefined,
    email: row.email || undefined,
    latitude: row.latitude ? Number(row.latitude) : undefined,
    longitude: row.longitude ? Number(row.longitude) : undefined,
    isActive: row.is_active !== false,
    minimumOrderValue: row.minimum_order_value !== undefined ? Number(row.minimum_order_value) : 200,
    freeDeliveryThreshold: row.free_delivery_threshold !== undefined ? Number(row.free_delivery_threshold) : 499,
    packagingFee: row.packaging_fee !== undefined ? Number(row.packaging_fee) : 25,
    avgCookingTime: row.avg_cooking_time || '25-35 mins',
    deliveryFee: row.delivery_fee !== undefined ? Number(row.delivery_fee) : 40,
    operatingHours: row.operating_hours || '11:00 AM - 11:30 PM',
    heroFireLine: row.hero_fire_line || undefined,
    heroHeader: row.hero_header || undefined,
    heroDescription: row.hero_description || undefined,
    trustBadgeRating: row.trust_badge_rating || undefined,
    trustBadgeRatingSub: row.trust_badge_rating_sub || undefined,
    trustBadgeUsp: row.trust_badge_usp || undefined,
    trustBadgeUspSub: row.trust_badge_usp_sub || undefined,
    assignedProductIds: Array.isArray(row.assigned_product_ids) ? row.assigned_product_ids : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOutletToDbOutlet(o: Partial<Outlet>): any {
  const dbObj: any = {};
  if (o.id !== undefined) dbObj.id = o.id;
  if (o.name !== undefined) dbObj.name = o.name.trim();
  if (o.city !== undefined) dbObj.city = o.city.trim();
  if (o.state !== undefined) dbObj.state = o.state?.trim() || null;
  if (o.address !== undefined) dbObj.address = o.address.trim();
  if (o.phone !== undefined) dbObj.phone = o.phone?.trim() || null;
  if (o.email !== undefined) dbObj.email = o.email?.trim() || null;
  if (o.latitude !== undefined) dbObj.latitude = o.latitude ? Number(o.latitude) : null;
  if (o.longitude !== undefined) dbObj.longitude = o.longitude ? Number(o.longitude) : null;
  if (o.isActive !== undefined) dbObj.is_active = !!o.isActive;
  if (o.minimumOrderValue !== undefined) dbObj.minimum_order_value = Number(o.minimumOrderValue);
  if (o.freeDeliveryThreshold !== undefined) dbObj.free_delivery_threshold = Number(o.freeDeliveryThreshold);
  if (o.packagingFee !== undefined) dbObj.packaging_fee = Number(o.packagingFee);
  if (o.avgCookingTime !== undefined) dbObj.avg_cooking_time = o.avgCookingTime;
  if (o.deliveryFee !== undefined) dbObj.delivery_fee = Number(o.deliveryFee);
  if (o.operatingHours !== undefined) dbObj.operating_hours = o.operatingHours;
  if (o.heroFireLine !== undefined) dbObj.hero_fire_line = o.heroFireLine;
  if (o.heroHeader !== undefined) dbObj.hero_header = o.heroHeader;
  if (o.heroDescription !== undefined) dbObj.hero_description = o.heroDescription;
  if (o.trustBadgeRating !== undefined) dbObj.trust_badge_rating = o.trustBadgeRating;
  if (o.trustBadgeRatingSub !== undefined) dbObj.trust_badge_rating_sub = o.trustBadgeRatingSub;
  if (o.trustBadgeUsp !== undefined) dbObj.trust_badge_usp = o.trustBadgeUsp;
  if (o.trustBadgeUspSub !== undefined) dbObj.trust_badge_usp_sub = o.trustBadgeUspSub;
  if (o.assignedProductIds !== undefined) dbObj.assigned_product_ids = o.assignedProductIds;
  dbObj.updated_at = new Date().toISOString();
  return dbObj;
}

export function mapDbZoneToZone(row: any): DeliveryZone {
  return {
    id: row.id,
    name: row.name || undefined,
    outletId: row.outlet_id,
    pinCodes: Array.isArray(row.pin_codes) ? row.pin_codes : [],
    deliveryFee: row.delivery_fee !== undefined ? Number(row.delivery_fee) : 40,
    estimatedDeliveryTime: row.estimated_delivery_time || undefined,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapZoneToDbZone(z: Partial<DeliveryZone>): any {
  const dbObj: any = {};
  if (z.id !== undefined) dbObj.id = z.id;
  if (z.name !== undefined) dbObj.name = z.name || null;
  if (z.outletId !== undefined) dbObj.outlet_id = z.outletId;
  if (z.pinCodes !== undefined) dbObj.pin_codes = z.pinCodes;
  if (z.deliveryFee !== undefined) dbObj.delivery_fee = Number(z.deliveryFee);
  if (z.estimatedDeliveryTime !== undefined) dbObj.estimated_delivery_time = z.estimatedDeliveryTime || null;
  if (z.isActive !== undefined) dbObj.is_active = !!z.isActive;
  dbObj.updated_at = new Date().toISOString();
  return dbObj;
}

export function mapDbAboutToAbout(row: any): OutletAbout {
  return {
    id: row.id,
    outletId: row.outlet_id,
    heroFireLine: row.hero_fire_line || undefined,
    heroHeader: row.hero_header || undefined,
    heroDescription: row.hero_description || undefined,
    storyLine: row.story_line || undefined,
    storyTitle: row.story_title || undefined,
    storyDescription: row.story_description || undefined,
    storyHighlight1Title: row.story_highlight1_title || undefined,
    storyHighlight1Description: row.story_highlight1_description || undefined,
    storyHighlight2Title: row.story_highlight2_title || undefined,
    storyHighlight2Description: row.story_highlight2_description || undefined,
    outletImage: row.outlet_image || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAboutToDbAbout(a: Partial<OutletAbout>): any {
  const dbObj: any = {};
  if (a.id !== undefined) dbObj.id = a.id;
  if (a.outletId !== undefined) dbObj.outlet_id = a.outletId;
  if (a.heroFireLine !== undefined) dbObj.hero_fire_line = a.heroFireLine;
  if (a.heroHeader !== undefined) dbObj.hero_header = a.heroHeader;
  if (a.heroDescription !== undefined) dbObj.hero_description = a.heroDescription;
  if (a.storyLine !== undefined) dbObj.story_line = a.storyLine;
  if (a.storyTitle !== undefined) dbObj.story_title = a.storyTitle;
  if (a.storyDescription !== undefined) dbObj.story_description = a.storyDescription;
  if (a.storyHighlight1Title !== undefined) dbObj.story_highlight1_title = a.storyHighlight1Title;
  if (a.storyHighlight1Description !== undefined) dbObj.story_highlight1_description = a.storyHighlight1Description;
  if (a.storyHighlight2Title !== undefined) dbObj.story_highlight2_title = a.storyHighlight2Title;
  if (a.storyHighlight2Description !== undefined) dbObj.story_highlight2_description = a.storyHighlight2Description;
  if (a.outletImage !== undefined) dbObj.outlet_image = a.outletImage;
  dbObj.updated_at = new Date().toISOString();
  return dbObj;
}

// ============================================================================
// SUPABASE PRODUCTS API
// ============================================================================

export async function fetchSupabaseProducts(includeInactive = false): Promise<Product[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!includeInactive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.map(mapDbProductToProduct);
}

export async function fetchSupabaseProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  return mapDbProductToProduct(data);
}

export async function createSupabaseProduct(productData: Partial<Product>): Promise<Product> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const newId = productData.id ? String(productData.id) : `prod-${Date.now().toString(36)}`;
  let baseSlug = (productData.slug || productData.name || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const payload = mapProductToDbProduct({
    ...productData,
    id: newId,
    slug: baseSlug,
    active: productData.active !== false,
    inStock: productData.inStock !== false,
  });

  const { data, error } = await supabase.from('products').insert(payload).select().single();
  if (error) throw error;
  return mapDbProductToProduct(data);
}

export async function updateSupabaseProduct(id: string | number, productData: Partial<Product>): Promise<Product> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const payload = mapProductToDbProduct(productData);
  delete payload.id; // Primary key immutable

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', String(id))
    .select()
    .single();

  if (error) throw error;
  return mapDbProductToProduct(data);
}

export async function deleteSupabaseProduct(id: string | number): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { error } = await supabase.from('products').delete().eq('id', String(id));
  if (error) throw error;
  return true;
}

export async function toggleSupabaseProductActive(id: string | number): Promise<Product> {
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('active')
    .eq('id', String(id))
    .single();
  if (fetchErr) throw fetchErr;

  const newActive = !existing.active;
  const { data, error } = await supabase
    .from('products')
    .update({ active: newActive, updated_at: new Date().toISOString() })
    .eq('id', String(id))
    .select()
    .single();

  if (error) throw error;
  return mapDbProductToProduct(data);
}

export async function toggleSupabaseProductStock(id: string | number): Promise<Product> {
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('in_stock')
    .eq('id', String(id))
    .single();
  if (fetchErr) throw fetchErr;

  const newStock = !existing.in_stock;
  const { data, error } = await supabase
    .from('products')
    .update({ in_stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', String(id))
    .select()
    .single();

  if (error) throw error;
  return mapDbProductToProduct(data);
}

export async function updateSupabaseOutletProductConfig(
  outletId: string,
  productId: string | number,
  config: { inStock?: boolean; isFeatured?: boolean; isBestseller?: boolean; isChefSpecial?: boolean; isAssigned?: boolean }
): Promise<Product> {
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', String(productId))
    .single();
  if (fetchErr) throw fetchErr;

  const currentProduct = mapDbProductToProduct(existing);
  let outlets = Array.isArray(currentProduct.outlets) ? [...currentProduct.outlets] : [];

  if (config.isAssigned === false) {
    outlets = outlets.filter((o) => o.outletId !== outletId);
  } else {
    const idx = outlets.findIndex((o) => o.outletId === outletId);
    if (idx >= 0) {
      outlets[idx] = {
        ...outlets[idx],
        inStock: config.inStock !== undefined ? config.inStock : outlets[idx].inStock,
        isFeatured: config.isFeatured !== undefined ? config.isFeatured : outlets[idx].isFeatured,
        isBestseller: config.isBestseller !== undefined ? config.isBestseller : outlets[idx].isBestseller,
        isChefSpecial: config.isChefSpecial !== undefined ? config.isChefSpecial : outlets[idx].isChefSpecial,
      };
    } else {
      outlets.push({
        outletId,
        inStock: config.inStock !== undefined ? config.inStock : true,
        isFeatured: !!config.isFeatured,
        isBestseller: !!config.isBestseller,
        isChefSpecial: !!config.isChefSpecial,
      });
    }
  }

  const outletIds = outlets.map((o) => o.outletId);

  const { data, error } = await supabase
    .from('products')
    .update({
      outlets,
      outlet_ids: outletIds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(productId))
    .select()
    .single();

  if (error) throw error;
  return mapDbProductToProduct(data);
}

export async function batchUpdateSupabaseOutletProducts(
  outletId: string,
  updates: {
    productId: string | number;
    isAssigned?: boolean;
    inStock?: boolean;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isChefSpecial?: boolean;
  }[]
): Promise<Product[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { data: dbProducts, error: fetchErr } = await supabase.from('products').select('*');
  if (fetchErr) throw fetchErr;

  const currentProducts = (dbProducts || []).map(mapDbProductToProduct);
  const assignedProductIds: (string | number)[] = [];

  for (const item of updates) {
    const prod = currentProducts.find((p) => String(p.id) === String(item.productId));
    if (!prod) continue;

    let outlets = Array.isArray(prod.outlets) ? [...prod.outlets] : [];
    if (item.isAssigned === false) {
      outlets = outlets.filter((o) => o.outletId !== outletId);
    } else {
      assignedProductIds.push(prod.id);
      const existingIdx = outlets.findIndex((o) => o.outletId === outletId);
      if (existingIdx >= 0) {
        outlets[existingIdx] = {
          ...outlets[existingIdx],
          inStock: item.inStock !== undefined ? item.inStock : outlets[existingIdx].inStock,
          isFeatured: item.isFeatured !== undefined ? item.isFeatured : outlets[existingIdx].isFeatured,
          isBestseller: item.isBestseller !== undefined ? item.isBestseller : outlets[existingIdx].isBestseller,
          isChefSpecial: item.isChefSpecial !== undefined ? item.isChefSpecial : outlets[existingIdx].isChefSpecial,
        };
      } else {
        outlets.push({
          outletId,
          inStock: item.inStock !== undefined ? item.inStock : true,
          isFeatured: !!item.isFeatured,
          isBestseller: !!item.isBestseller,
          isChefSpecial: !!item.isChefSpecial,
        });
      }
    }

    const outletIds = outlets.map((o) => o.outletId);

    await supabase
      .from('products')
      .update({
        outlets,
        outlet_ids: outletIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(prod.id));
  }

  // Also sync assigned_product_ids on the outlet row itself
  try {
    await supabase
      .from('outlets')
      .update({
        assigned_product_ids: assignedProductIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outletId);
  } catch (err) {
    console.warn('Syncing outlet assigned_product_ids error (non-fatal):', err);
  }

  return fetchSupabaseProducts(true);
}

// ============================================================================
// SUPABASE OUTLETS API
// ============================================================================

export async function fetchSupabaseOutlets(includeInactive = false): Promise<Outlet[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  let query = supabase.from('outlets').select('*').order('name', { ascending: true });
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.map(mapDbOutletToOutlet);
}

export async function createSupabaseOutlet(outletData: Partial<Outlet>): Promise<Outlet> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const cleanCity = outletData.city?.trim() || 'Bangalore';
  let baseId = (outletData.id || `${cleanCity.slice(0, 3).toLowerCase()}-${(outletData.name || 'outlet').replace(/gaon ka swad/gi, '').trim().toLowerCase()}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const payload = mapOutletToDbOutlet({
    ...outletData,
    id: baseId || `outlet-${Date.now()}`,
    isActive: outletData.isActive !== false,
  });

  const { data, error } = await supabase.from('outlets').insert(payload).select().single();
  if (error) throw error;
  return mapDbOutletToOutlet(data);
}

export async function updateSupabaseOutlet(id: string, outletData: Partial<Outlet>): Promise<Outlet> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const payload = mapOutletToDbOutlet(outletData);
  delete payload.id;

  const { data, error } = await supabase
    .from('outlets')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDbOutletToOutlet(data);
}

export async function toggleSupabaseOutletActive(id: string): Promise<Outlet> {
  const { data: existing, error: fetchErr } = await supabase
    .from('outlets')
    .select('is_active')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const { data, error } = await supabase
    .from('outlets')
    .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDbOutletToOutlet(data);
}

export async function deleteSupabaseOutlet(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { error } = await supabase.from('outlets').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================================
// SUPABASE DELIVERY ZONES API
// ============================================================================

export async function fetchSupabaseZones(includeInactive = false): Promise<DeliveryZone[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  let query = supabase.from('delivery_zones').select('*').order('created_at', { ascending: true });
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  return data.map(mapDbZoneToZone);
}

export async function createSupabaseZone(zoneData: Partial<DeliveryZone>): Promise<DeliveryZone> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const newId = zoneData.id || `zone-${zoneData.outletId}-${Date.now().toString(36)}`;
  const payload = mapZoneToDbZone({
    ...zoneData,
    id: newId,
    isActive: zoneData.isActive !== false,
  });

  const { data, error } = await supabase.from('delivery_zones').insert(payload).select().single();
  if (error) throw error;
  return mapDbZoneToZone(data);
}

export async function updateSupabaseZone(id: string, zoneData: Partial<DeliveryZone>): Promise<DeliveryZone> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const payload = mapZoneToDbZone(zoneData);
  delete payload.id;

  const { data, error } = await supabase
    .from('delivery_zones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDbZoneToZone(data);
}

export async function toggleSupabaseZoneActive(id: string): Promise<DeliveryZone> {
  const { data: existing, error: fetchErr } = await supabase
    .from('delivery_zones')
    .select('is_active')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const { data, error } = await supabase
    .from('delivery_zones')
    .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDbZoneToZone(data);
}

export async function deleteSupabaseZone(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================================
// SUPABASE ABOUTS API (1:1 with Outlets)
// ============================================================================

export async function fetchSupabaseAboutByOutletId(outletId: string): Promise<OutletAbout | null> {
  if (!isSupabaseConfigured() || !outletId) return null;

  try {
    const { data, error } = await supabase
      .from('abouts')
      .select('*')
      .eq('outlet_id', outletId)
      .maybeSingle();

    if (error) {
      console.warn('fetchSupabaseAboutByOutletId error:', error);
      return null;
    }
    if (!data) return null;
    return mapDbAboutToAbout(data);
  } catch (err) {
    console.warn('fetchSupabaseAboutByOutletId exception:', err);
    return null;
  }
}

export async function fetchAllSupabaseAbouts(): Promise<OutletAbout[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('abouts')
      .select('*');

    if (error) {
      console.warn('fetchAllSupabaseAbouts error:', error);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map(mapDbAboutToAbout);
  } catch (err) {
    console.warn('fetchAllSupabaseAbouts exception:', err);
    return [];
  }
}

export async function upsertSupabaseAbout(aboutData: Partial<OutletAbout>): Promise<OutletAbout> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  if (!aboutData.outletId) throw new Error('outletId is required for about customization');

  const payload = mapAboutToDbAbout(aboutData);
  delete payload.id;

  const { data, error } = await supabase
    .from('abouts')
    .upsert(payload, { onConflict: 'outlet_id' })
    .select()
    .single();

  if (error) throw error;
  return mapDbAboutToAbout(data);
}

// ============================================================================
// ============================================================================
// SUPABASE ORDERS API
// ============================================================================

export function mapDbCustomerToCustomer(row: any): Customer {
  return {
    id: String(row.id),
    phone: String(row.phone || '').replace(/\D/g, '').slice(-10),
    fullName: row.full_name || 'Customer',
    email: row.email || undefined,
    isActive: row.is_phone_verified !== false,
    marketingConsent: !!row.marketing_consent,
    welcomeDiscountUsed: !!row.welcome_discount_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDbAddressToCustomerAddress(row: any): CustomerAddress {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    addressLabel: row.label || 'Home',
    fullAddress: row.address_line1 + (row.address_line2 ? `, ${row.address_line2}` : ''),
    landmark: row.landmark || undefined,
    city: row.city || 'Bangalore',
    state: 'Karnataka',
    pincode: row.pincode || '',
    isDefault: row.is_default !== false,
    createdAt: row.created_at,
  };
}

/**
 * Lookup customer in Supabase public.customers by 10-digit phone
 */
export async function fetchSupabaseCustomerByPhone(phone: string): Promise<{
  customer: Customer | null;
  defaultAddress: CustomerAddress | null;
}> {
  if (!isSupabaseConfigured()) return { customer: null, defaultAddress: null };

  const normPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (!normPhone || normPhone.length !== 10) return { customer: null, defaultAddress: null };

  try {
    const { data: customerRow, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normPhone)
      .maybeSingle();

    if (error) {
      console.warn('Supabase customer lookup warning:', error.message);
      return { customer: null, defaultAddress: null };
    }

    if (!customerRow) {
      return { customer: null, defaultAddress: null };
    }

    const customer = mapDbCustomerToCustomer(customerRow);

    // Fetch default address
    let defaultAddress: CustomerAddress | null = null;
    try {
      const { data: addrRow } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerRow.id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (addrRow) {
        defaultAddress = mapDbAddressToCustomerAddress(addrRow);
      }
    } catch {}

    return { customer, defaultAddress };
  } catch (err) {
    console.error('fetchSupabaseCustomerByPhone exception:', err);
    return { customer: null, defaultAddress: null };
  }
}

/**
 * Upsert customer into Supabase public.customers table
 */
export async function upsertSupabaseCustomer(customerData: {
  phone: string;
  fullName?: string;
  email?: string;
  marketingConsent?: boolean;
  welcomeDiscountUsed?: boolean;
}): Promise<Customer> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const normPhone = String(customerData.phone || '').replace(/\D/g, '').slice(-10);
  if (!normPhone || normPhone.length !== 10) {
    throw new Error('Valid 10-digit phone number is required');
  }

  // Check if customer already exists
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', normPhone)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const updatePayload: any = {
      updated_at: now,
    };
    if (customerData.fullName) updatePayload.full_name = customerData.fullName.trim();
    if (customerData.email !== undefined) updatePayload.email = customerData.email ? customerData.email.trim() : null;
    if (customerData.marketingConsent !== undefined) updatePayload.marketing_consent = !!customerData.marketingConsent;
    if (customerData.welcomeDiscountUsed !== undefined) updatePayload.welcome_discount_used = !!customerData.welcomeDiscountUsed;

    const { data: updated, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return mapDbCustomerToCustomer(updated);
  } else {
    // Insert new customer
    const insertPayload: any = {
      phone: normPhone,
      full_name: customerData.fullName?.trim() || 'Customer',
      email: customerData.email?.trim() || null,
      is_phone_verified: true,
      marketing_consent: !!customerData.marketingConsent,
      welcome_discount_used: !!customerData.welcomeDiscountUsed,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error } = await supabase
      .from('customers')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return mapDbCustomerToCustomer(inserted);
  }
}

/**
 * Upsert customer delivery address to Supabase public.customer_addresses table
 */
export async function upsertSupabaseCustomerAddress(
  customerId: string,
  addressData: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const now = new Date().toISOString();
  const payload: any = {
    customer_id: customerId,
    label: addressData.addressLabel || 'Home',
    address_line1: addressData.fullAddress || '',
    address_line2: null,
    landmark: addressData.landmark || null,
    city: addressData.city || 'Bangalore',
    pincode: addressData.pincode || '',
    is_default: addressData.isDefault !== false,
    created_at: now,
  };

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapDbAddressToCustomerAddress(data);
}

export async function createSupabaseOrder(orderData: Partial<Order>): Promise<Order> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const id = `order-${Date.now().toString(36)}`;
  const orderId = orderData.orderId || `GKS-${Date.now().toString().slice(-6)}`;

  const payload = {
    id,
    order_id: orderId,
    outlet_id: orderData.outletId,
    outlet_name: orderData.outletName || 'Gaon Ka Swad Kitchen',
    delivery_pincode: orderData.deliveryPinCode,
    items: orderData.items || [],
    subtotal: Number(orderData.subtotal || 0),
    discount: Number(orderData.discount || 0),
    delivery_fee: Number(orderData.deliveryFee || 0),
    packaging_fee: Number(orderData.packagingFee || 0),
    gst: Number(orderData.gst || 0),
    total: Number(orderData.total || 0),
    coupon_code: orderData.couponCode || null,
    customer_details: orderData.customerDetails,
    status: orderData.status || 'Received',
    estimated_delivery_minutes: orderData.estimatedDeliveryMinutes || 35,
  };

  const { data, error } = await supabase.from('orders').insert(payload).select().single();
  if (error) throw error;

  return {
    ...orderData,
    id: data.id,
    orderId: data.order_id,
    outletId: data.outlet_id,
    deliveryPinCode: data.delivery_pincode,
    createdAt: data.created_at,
    items: data.items,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    deliveryFee: Number(data.delivery_fee),
    packagingFee: Number(data.packaging_fee),
    gst: Number(data.gst),
    total: Number(data.total),
    customerDetails: data.customer_details,
    status: data.status,
    estimatedDeliveryMinutes: data.estimated_delivery_minutes,
  } as Order;
}

// ============================================================================
// HEALTH CHECK & ONE-CLICK AUTO SEEDER
// ============================================================================

export interface SupabaseHealthStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tableCounts: {
    products: number;
    outlets: number;
    zones: number;
    categories: number;
    orders: number;
    abouts?: number;
  };
  error?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      isConnected: false,
      tableCounts: { products: 0, outlets: 0, zones: 0, categories: 0, orders: 0, abouts: 0 },
      error: 'Supabase credentials not configured in environment',
    };
  }

  try {
    const [pRes, oRes, zRes, cRes, ordRes, abRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('outlets').select('*', { count: 'exact', head: true }),
      supabase.from('delivery_zones').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('abouts').select('*', { count: 'exact', head: true }),
    ]);

    if (pRes.error || oRes.error || zRes.error) {
      const errMessage = (pRes.error || oRes.error || zRes.error)?.message || 'Table query error';
      return {
        isConfigured: true,
        isConnected: false,
        tableCounts: { products: 0, outlets: 0, zones: 0, categories: 0, orders: 0, abouts: 0 },
        error: `Supabase error: ${errMessage}. (Note: Have you run supabase/schema.sql in your Supabase SQL Editor?)`,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      tableCounts: {
        products: pRes.count || 0,
        outlets: oRes.count || 0,
        zones: zRes.count || 0,
        categories: cRes.count || 0,
        orders: ordRes.count || 0,
        abouts: abRes?.count || 0,
      },
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      tableCounts: { products: 0, outlets: 0, zones: 0, categories: 0, orders: 0, abouts: 0 },
      error: err.message || 'Failed to connect to Supabase',
    };
  }
}

/**
 * One-click cloud database migration seeder
 * Uploads all initial menu products, outlets, and delivery zones to Supabase PostgreSQL.
 */
export async function seedSupabaseDatabase(force = false): Promise<{
  success: boolean;
  insertedProducts: number;
  insertedOutlets: number;
  insertedZones: number;
  insertedCategories: number;
  insertedAbouts: number;
  message: string;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase URL and Anon Key are required to seed data.');
  }

  // 1. Check existing counts
  const health = await checkSupabaseHealth();
  if (!health.isConnected) {
    throw new Error(
      health.error || 'Cannot connect to Supabase. Ensure schema.sql is executed in your Supabase SQL Editor.'
    );
  }

  let insertedCategories = 0;
  let insertedOutlets = 0;
  let insertedZones = 0;
  let insertedProducts = 0;
  let insertedAbouts = 0;

  // 2. Seed Categories
  if (health.tableCounts.categories === 0 || force) {
    const catPayloads = INITIAL_CATEGORIES.map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      tagline: c.tagline,
      image: c.image,
      icon_name: c.iconName,
      sort_order: i,
    }));
    const { error: catErr } = await supabase.from('categories').upsert(catPayloads, { onConflict: 'id' });
    if (catErr) console.warn('Categories seed warning:', catErr);
    else insertedCategories = catPayloads.length;
  }

  // 3. Seed Outlets
  if (health.tableCounts.outlets === 0 || force) {
    const outletPayloads = INITIAL_OUTLETS.map(mapOutletToDbOutlet);
    const { error: outletErr } = await supabase.from('outlets').upsert(outletPayloads, { onConflict: 'id' });
    if (outletErr) console.warn('Outlets seed warning:', outletErr);
    else insertedOutlets = outletPayloads.length;
  }

  // 4. Seed Delivery Zones
  if (health.tableCounts.zones === 0 || force) {
    const zonePayloads = INITIAL_DELIVERY_ZONES.map(mapZoneToDbZone);
    const { error: zoneErr } = await supabase.from('delivery_zones').upsert(zonePayloads, { onConflict: 'id' });
    if (zoneErr) console.warn('Zones seed warning:', zoneErr);
    else insertedZones = zonePayloads.length;
  }

  // 5. Seed Abouts
  if ((health.tableCounts.abouts || 0) === 0 || force) {
    const aboutPayloads = INITIAL_OUTLET_ABOUTS.map(mapAboutToDbAbout);
    const { error: aboutErr } = await supabase.from('abouts').upsert(aboutPayloads, { onConflict: 'outlet_id' });
    if (aboutErr) console.warn('Abouts seed warning:', aboutErr);
    else insertedAbouts = aboutPayloads.length;
  }

  // 6. Seed Products
  if (health.tableCounts.products === 0 || force) {
    const productPayloads = INITIAL_PRODUCTS.map((p) =>
      mapProductToDbProduct({
        ...p,
        outlets: Array.isArray(p.outlets)
          ? p.outlets
          : INITIAL_OUTLETS.map((o) => ({
              outletId: o.id,
              inStock: true,
              isFeatured: !!p.featured,
              isBestseller: !!p.bestseller,
              isChefSpecial: !!p.chefSpecial,
            })),
        outletIds: Array.isArray(p.outletIds) ? p.outletIds : INITIAL_OUTLETS.map((o) => o.id),
      })
    );

    const { error: prodErr } = await supabase.from('products').upsert(productPayloads, { onConflict: 'id' });
    if (prodErr) throw prodErr;
    insertedProducts = productPayloads.length;
  }

  return {
    success: true,
    insertedProducts,
    insertedOutlets,
    insertedZones,
    insertedCategories,
    insertedAbouts,
    message: `Successfully seeded ${insertedProducts} products, ${insertedOutlets} outlets, ${insertedAbouts} about pages, and ${insertedZones} delivery zones to Supabase PostgreSQL.`,
  };
}

// ============================================================================
// PROFILES & USER ROLES (SUPABASE AUTH INTEGRATION)
// ============================================================================

export function mapDbProfileToProfile(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    role: (row.role as UserRole) || 'customer',
    outletId: row.outlet_id || undefined,
    fullName: row.full_name || undefined,
    phone: row.phone || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches user profile from public.profiles table by UUID
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error);
      return null;
    }

    return data ? mapDbProfileToProfile(data) : null;
  } catch (err) {
    console.error('fetchUserProfile exception:', err);
    return null;
  }
}

/**
 * Fetches the currently authenticated Supabase user's profile
 */
export async function fetchCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return null;

    let profile = await fetchUserProfile(user.id);

    // If profile doesn't exist yet (trigger delay or created before trigger), create/upsert it
    if (!profile) {
      const email = user.email || '';
      const isOwner = email.toLowerCase() === 'achieveruks@gmail.com' || (user.user_metadata?.role === 'owner');
      const role: UserRole = isOwner ? 'owner' : (user.user_metadata?.role || 'customer');
      const outletId = user.user_metadata?.outlet_id || null;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email,
          role,
          outlet_id: outletId,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (!error && data) {
        profile = mapDbProfileToProfile(data);
      }
    }

    return profile;
  } catch (err) {
    console.error('fetchCurrentProfile exception:', err);
    return null;
  }
}

/**
 * Updates a user's profile role or outlet assignment (Owner only)
 */
export async function updateProfileRole(
  userId: string,
  role: UserRole,
  outletId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        outlet_id: outletId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('updateProfileRole error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('updateProfileRole exception:', err);
    return false;
  }
}

/**
 * Fetches all registered staff/user profiles (Owner view)
 */
export async function fetchProfilesList(): Promise<Profile[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchProfilesList error:', error);
      return [];
    }

    return Array.isArray(data) ? data.map(mapDbProfileToProfile) : [];
  } catch (err) {
    console.error('fetchProfilesList exception:', err);
    return [];
  }
}

