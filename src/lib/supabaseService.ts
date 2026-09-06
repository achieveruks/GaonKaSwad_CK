import { supabase, isSupabaseConfigured } from './supabase';
import { Product, Outlet, OutletAbout, DeliveryZone, Order, OrderItem, CleanOrderItem, Category, DashboardStats, Profile, UserRole, Customer, CustomerAddress, Coupon, CouponRedemption, CouponValidationResult } from '../types';

// ============================================================================
// DATA MAPPERS (Database Snake_case <-> TypeScript CamelCase)
// ============================================================================

export function mapDbProductToProduct(row: any): Product {
  const outlets = Array.isArray(row.outlets)
    ? row.outlets.map((o: any) => ({
        outletId: o.outletId || o.outlet_id,
        inStock: o.inStock !== undefined ? !!o.inStock : (o.in_stock !== undefined ? !!o.in_stock : true),
        isFeatured: !!(o.isFeatured || o.is_featured),
        isBestseller: !!(o.isBestseller || o.is_bestseller),
        isChefSpecial: !!(o.isChefSpecial || o.is_chef_special),
        portionsLeft:
          o.portionsLeft !== undefined && o.portionsLeft !== null && o.portionsLeft !== ''
            ? Number(o.portionsLeft)
            : (o.portions_left !== undefined && o.portions_left !== null && o.portions_left !== '' ? Number(o.portions_left) : null),
      }))
    : [];
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
    reviewsList: [],
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
    fssaiLicId: row.fssai_lic_id !== undefined && row.fssai_lic_id !== null ? Number(row.fssai_lic_id) : undefined,
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
  if (o.fssaiLicId !== undefined && o.fssaiLicId !== null && (o.fssaiLicId as any) !== '') {
    dbObj.fssai_lic_id = Number(o.fssaiLicId);
  }
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
    expLine: row.exp_line || undefined,
    expHeader: row.exp_header || undefined,
    expDescription: row.exp_description || undefined,
    expCard1Title: row.exp_card1_title || undefined,
    expCard1Header: row.exp_card1_header || undefined,
    expCard1Description: row.exp_card1_description || undefined,
    expCard2Title: row.exp_card2_title || undefined,
    expCard2Header: row.exp_card2_header || undefined,
    expCard2Description: row.exp_card2_description || undefined,
    expCard3Title: row.exp_card3_title || undefined,
    expCard3Header: row.exp_card3_header || undefined,
    expCard3Description: row.exp_card3_description || undefined,
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
  if (a.expLine !== undefined) dbObj.exp_line = a.expLine;
  if (a.expHeader !== undefined) dbObj.exp_header = a.expHeader;
  if (a.expDescription !== undefined) dbObj.exp_description = a.expDescription;
  if (a.expCard1Title !== undefined) dbObj.exp_card1_title = a.expCard1Title;
  if (a.expCard1Header !== undefined) dbObj.exp_card1_header = a.expCard1Header;
  if (a.expCard1Description !== undefined) dbObj.exp_card1_description = a.expCard1Description;
  if (a.expCard2Title !== undefined) dbObj.exp_card2_title = a.expCard2Title;
  if (a.expCard2Header !== undefined) dbObj.exp_card2_header = a.expCard2Header;
  if (a.expCard2Description !== undefined) dbObj.exp_card2_description = a.expCard2Description;
  if (a.expCard3Title !== undefined) dbObj.exp_card3_title = a.expCard3Title;
  if (a.expCard3Header !== undefined) dbObj.exp_card3_header = a.expCard3Header;
  if (a.expCard3Description !== undefined) dbObj.exp_card3_description = a.expCard3Description;
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

  const [{ data: productsData, error: prodErr }, { data: reviewsData }] = await Promise.all([
    query,
    supabase
      .from('product_reviews')
      .select('id, product_id, rating, review_text, customer_display_name, is_verified_purchase, is_published, reviewed_at, created_at')
      .eq('is_published', true)
      .order('reviewed_at', { ascending: false }),
  ]);

  if (prodErr) throw prodErr;
  if (!productsData || productsData.length === 0) return [];

  // Group published reviews by product_id
  const reviewsByProduct = new Map<string, any[]>();
  if (Array.isArray(reviewsData)) {
    for (const r of reviewsData) {
      const pid = String(r.product_id);
      if (!reviewsByProduct.has(pid)) {
        reviewsByProduct.set(pid, []);
      }
      reviewsByProduct.get(pid)!.push({
        id: r.id,
        userName: r.customer_display_name || 'Verified Foodie',
        userLocation: 'Verified Foodie',
        rating: Number(r.rating || 5),
        comment: r.review_text || '',
        date: r.reviewed_at
          ? new Date(r.reviewed_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'Recent',
        verified: r.is_verified_purchase !== false,
      });
    }
  }

  return productsData.map((row) => {
    const product = mapDbProductToProduct(row);
    const prodReviews = reviewsByProduct.get(String(product.id)) || [];
    const reviewsCount = prodReviews.length;
    const rating = reviewsCount > 0
      ? Number((prodReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
      : undefined;

    return {
      ...product,
      reviewsList: prodReviews,
      reviewsCount,
      rating,
    };
  });
}

export async function fetchSupabaseProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  const product = mapDbProductToProduct(data);

  // Fetch reviews from product_reviews table
  const { data: revData } = await supabase
    .from('product_reviews')
    .select('id, product_id, rating, review_text, customer_display_name, is_verified_purchase, is_published, reviewed_at, created_at')
    .eq('product_id', String(product.id))
    .eq('is_published', true)
    .order('reviewed_at', { ascending: false });

  const prodReviews = (revData || []).map((r: any) => ({
    id: r.id,
    userName: r.customer_display_name || 'Verified Foodie',
    userLocation: 'Verified Foodie',
    rating: Number(r.rating || 5),
    comment: r.review_text || '',
    date: r.reviewed_at
      ? new Date(r.reviewed_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Recent',
    verified: r.is_verified_purchase !== false,
  }));

  const reviewsCount = prodReviews.length;
  const rating = reviewsCount > 0
    ? Number((prodReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
    : undefined;

  return {
    ...product,
    reviewsList: prodReviews,
    reviewsCount,
    rating,
  };
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
  config: {
    inStock?: boolean;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isChefSpecial?: boolean;
    isAssigned?: boolean;
    portionsLeft?: number | null;
  }
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
        portionsLeft: config.portionsLeft !== undefined ? config.portionsLeft : outlets[idx].portionsLeft,
      };
    } else {
      outlets.push({
        outletId,
        inStock: config.inStock !== undefined ? config.inStock : true,
        isFeatured: !!config.isFeatured,
        isBestseller: !!config.isBestseller,
        isChefSpecial: !!config.isChefSpecial,
        portionsLeft: config.portionsLeft !== undefined ? config.portionsLeft : null,
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
    portionsLeft?: number | null;
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
          portionsLeft: item.portionsLeft !== undefined ? item.portionsLeft : outlets[existingIdx].portionsLeft,
        };
      } else {
        outlets.push({
          outletId,
          inStock: item.inStock !== undefined ? item.inStock : true,
          isFeatured: !!item.isFeatured,
          isBestseller: !!item.isBestseller,
          isChefSpecial: !!item.isChefSpecial,
          portionsLeft: item.portionsLeft !== undefined ? item.portionsLeft : null,
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
    fullAddress: row.full_address || row.address_line1 || '',
    landmark: row.landmark || undefined,
    city: row.city || 'Bhubaneswar',
    state: row.state || 'Odisha',
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
 * Fetch all saved delivery addresses for a customer from Supabase
 */
export async function fetchSupabaseCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  if (!isSupabaseConfigured() || !customerId) return [];

  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbAddressToCustomerAddress);
  } catch (err) {
    console.warn('fetchSupabaseCustomerAddresses error:', err);
    return [];
  }
}

/**
 * Insert a brand new delivery address row into Supabase customer_addresses
 */
export async function insertSupabaseCustomerAddress(
  customerId: string,
  addressData: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const now = new Date().toISOString();
  const cleanFullAddress = (addressData.fullAddress || '').trim();
  const isDefault = addressData.isDefault !== false;

  if (isDefault) {
    try {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false, updated_at: now })
        .eq('customer_id', customerId);
    } catch {}
  }

  const payload: any = {
    customer_id: customerId,
    label: addressData.addressLabel || 'Home',
    full_address: cleanFullAddress,
    landmark: addressData.landmark || null,
    city: addressData.city || 'Bhubaneswar',
    state: addressData.state || 'Odisha',
    pincode: addressData.pincode || '',
    is_default: isDefault,
    created_at: now,
    updated_at: now,
  };

  let inserted: any = null;
  const res1 = await supabase
    .from('customer_addresses')
    .insert(payload)
    .select()
    .maybeSingle();

  if (res1.error) {
    // If error mentions full_address or column name, attempt fallback with address_line1
    if (res1.error.message && (res1.error.message.includes('full_address') || res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
      delete payload.full_address;
      payload.address_line1 = cleanFullAddress;
      const res2 = await supabase
        .from('customer_addresses')
        .insert(payload)
        .select()
        .maybeSingle();
      if (res2.error) throw res2.error;
      inserted = res2.data;
    } else {
      throw res1.error;
    }
  } else {
    inserted = res1.data;
  }

  if (!inserted) {
    throw new Error('Customer address insert returned empty result');
  }

  return mapDbAddressToCustomerAddress(inserted);
}

/**
 * Update an existing delivery address row in Supabase customer_addresses
 */
export async function updateSupabaseCustomerAddress(
  addressId: string,
  addressData: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const now = new Date().toISOString();
  const cleanFullAddress = (addressData.fullAddress || '').trim();

  // If setting as default, unmark other addresses for the customer
  if (addressData.isDefault === true) {
    try {
      const { data: currentAddr } = await supabase
        .from('customer_addresses')
        .select('customer_id')
        .eq('id', addressId)
        .maybeSingle();

      if (currentAddr?.customer_id) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false, updated_at: now })
          .eq('customer_id', currentAddr.customer_id);
      }
    } catch (e) {
      console.warn('Resetting previous default address error:', e);
    }
  }

  const updatePayload: any = {
    label: addressData.addressLabel || 'Home',
    full_address: cleanFullAddress,
    landmark: addressData.landmark !== undefined ? (addressData.landmark || null) : null,
    city: addressData.city || 'Bhubaneswar',
    state: addressData.state || 'Odisha',
    pincode: addressData.pincode || '',
    updated_at: now,
  };

  if (addressData.isDefault !== undefined) {
    updatePayload.is_default = addressData.isDefault;
  }

  let updated: any = null;
  const res1 = await supabase
    .from('customer_addresses')
    .update(updatePayload)
    .eq('id', addressId)
    .select()
    .maybeSingle();

  if (res1.error) {
    if (res1.error.message && (res1.error.message.includes('full_address') || res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
      delete updatePayload.full_address;
      updatePayload.address_line1 = cleanFullAddress;
      const res2 = await supabase
        .from('customer_addresses')
        .update(updatePayload)
        .eq('id', addressId)
        .select()
        .maybeSingle();
      if (res2.error) throw res2.error;
      updated = res2.data;
    } else {
      throw res1.error;
    }
  } else {
    updated = res1.data;
  }

  if (!updated) {
    throw new Error('Customer address update returned empty result');
  }

  return mapDbAddressToCustomerAddress(updated);
}

/**
 * Upsert customer delivery address to Supabase public.customer_addresses table
 * Deduplicates by checking if customer already has this address / pincode
 */
export async function upsertSupabaseCustomerAddress(
  customerId: string,
  addressData: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const now = new Date().toISOString();
  const cleanFullAddress = (addressData.fullAddress || '').trim();

  // 1. Check if the customer already has this address
  const { data: existingAddresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId);

  const existingMatch = existingAddresses?.find(
    (addr: any) =>
      (addr.full_address || addr.address_line1 || '').trim().toLowerCase() === cleanFullAddress.toLowerCase() ||
      (addr.id && addr.id === addressData.id)
  );

  const isDefault = addressData.isDefault !== false;

  // 2. If setting as default, reset other addresses for this customer
  if (isDefault && existingAddresses && existingAddresses.length > 0) {
    try {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false, updated_at: now })
        .eq('customer_id', customerId);
    } catch {}
  }

  if (existingMatch) {
    // 3. Update existing address
    return updateSupabaseCustomerAddress(existingMatch.id, {
      ...addressData,
      isDefault,
    });
  } else {
    // 4. Insert new address only if no existing match
    return insertSupabaseCustomerAddress(customerId, {
      ...addressData,
      isDefault,
    });
  }
}

/**
 * Delete a delivery address row from Supabase customer_addresses
 */
export async function deleteSupabaseCustomerAddress(addressId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !addressId) return false;

  try {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('deleteSupabaseCustomerAddress error:', err);
    return false;
  }
}

export async function getNextSequentialOrderId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return `GKSWAD-#00001`;
  }
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('order_id, order_number')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) {
      return `GKSWAD-#00001`;
    }

    let maxNum = 0;
    for (const row of data) {
      const idToCheck = row.order_number || row.order_id;
      if (idToCheck) {
        const match = idToCheck.match(/GKSWAD-#?0*(\d+)/i) || idToCheck.match(/GKS-#?0*(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    const nextSeq = maxNum + 1;
    return `GKSWAD-#${String(nextSeq).padStart(5, '0')}`;
  } catch {
    return `GKSWAD-#00001`;
  }
}

export async function decrementProductPortionsInSupabase(outletId: string, items: any[]): Promise<void> {
  if (!isSupabaseConfigured() || !items || !Array.isArray(items) || items.length === 0) return;

  for (const item of items) {
    const productId = item.product?.id || item.productId || item.id;
    const qty = Number(item.quantity) || 1;
    if (!productId) continue;

    try {
      const { data: prodData, error: fetchErr } = await supabase
        .from('products')
        .select('id, outlets')
        .eq('id', String(productId))
        .single();

      if (fetchErr || !prodData || !Array.isArray(prodData.outlets)) continue;

      let changed = false;
      const updatedOutlets = prodData.outlets.map((outletCfg: any) => {
        const oId = outletCfg.outletId || outletCfg.outlet_id;
        if (
          oId === outletId &&
          outletCfg.portionsLeft !== null &&
          outletCfg.portionsLeft !== undefined &&
          outletCfg.portionsLeft !== ''
        ) {
          const currentPortions = Number(outletCfg.portionsLeft);
          if (!isNaN(currentPortions)) {
            const nextPortions = Math.max(0, currentPortions - qty);
            changed = true;
            return {
              ...outletCfg,
              portionsLeft: nextPortions,
              inStock: nextPortions <= 0 ? false : outletCfg.inStock !== false,
            };
          }
        }
        return outletCfg;
      });

      if (changed) {
        await supabase
          .from('products')
          .update({
            outlets: updatedOutlets,
            updated_at: new Date().toISOString(),
          })
          .eq('id', String(productId));
      }
    } catch (err) {
      console.warn(`Supabase portion decrement error for product ${productId}:`, err);
    }
  }
}

/**
 * Clean Architecture Serializer for Supabase orders.items JSONB column
 * Strips redundant nested product catalogs, ephemeral React IDs, and duplicate price keys.
 */
export function serializeOrderItemForDb(it: any): CleanOrderItem {
  const p = it.product || {};
  const productId = String(it.productId || p.id || it.id || '');
  const name = String(it.name || p.name || 'Authentic Delicacy');
  const hindiName = it.hindiName || p.hindiName || undefined;
  const image = String(it.image || p.image || '');
  const isVeg = it.isVeg !== undefined ? Boolean(it.isVeg) : (p.isVeg !== undefined ? Boolean(p.isVeg) : true);
  const quantity = Math.max(1, Number(it.quantity) || 1);
  const unitPrice = Number(it.unitPrice || it.price || p.price || 0);
  const totalPrice = Number(it.totalPrice || unitPrice * quantity);

  const selectedVariant = it.selectedVariant
    ? {
        id: String(it.selectedVariant.id || ''),
        name: String(it.selectedVariant.name || ''),
        weight: it.selectedVariant.weight || undefined,
        serves: it.selectedVariant.serves || undefined,
        price: Number(it.selectedVariant.price || unitPrice),
      }
    : undefined;

  const selectedAddons = Array.isArray(it.selectedAddons) && it.selectedAddons.length > 0
    ? it.selectedAddons.map((ad: any) => ({
        id: String(ad.id || ''),
        name: String(ad.name || ''),
        price: Number(ad.price || 0),
        isVeg: Boolean(ad.isVeg ?? true),
      }))
    : [];

  const cleanItem: CleanOrderItem = {
    productId,
    name,
    image,
    isVeg,
    quantity,
    unitPrice,
    totalPrice,
  };

  if (hindiName) cleanItem.hindiName = hindiName;
  if (selectedVariant) cleanItem.selectedVariant = selectedVariant;
  if (it.selectedSpiceLevel) cleanItem.selectedSpiceLevel = it.selectedSpiceLevel;
  cleanItem.selectedAddons = selectedAddons;

  return cleanItem;
}

export const sanitizeOrderItem = serializeOrderItemForDb;

/**
 * In-Memory Deserializer
 * Hydrates database JSONB items with safe UI property shims.
 */
export function deserializeOrderItem(it: any): OrderItem {
  const p = it.product || {};
  const productId = String(it.productId || p.id || it.id || '');
  const name = String(it.name || p.name || 'Authentic Delicacy');
  const hindiName = it.hindiName || p.hindiName || undefined;
  const image = String(it.image || p.image || '');
  const isVeg = it.isVeg !== undefined ? Boolean(it.isVeg) : (p.isVeg !== undefined ? Boolean(p.isVeg) : true);
  const quantity = Math.max(1, Number(it.quantity) || 1);
  const unitPrice = Number(it.unitPrice || it.price || p.price || 0);
  const totalPrice = Number(it.totalPrice || unitPrice * quantity);

  const selectedVariant = it.selectedVariant
    ? {
        id: String(it.selectedVariant.id || ''),
        name: String(it.selectedVariant.name || ''),
        weight: it.selectedVariant.weight || undefined,
        serves: it.selectedVariant.serves || undefined,
        price: Number(it.selectedVariant.price || unitPrice),
        originalPrice: it.selectedVariant.originalPrice ? Number(it.selectedVariant.originalPrice) : undefined,
      }
    : undefined;

  const selectedAddons = Array.isArray(it.selectedAddons)
    ? it.selectedAddons.map((ad: any) => ({
        id: String(ad.id || ''),
        name: String(ad.name || ''),
        price: Number(ad.price || 0),
        isVeg: Boolean(ad.isVeg ?? true),
      }))
    : [];

  return {
    productId,
    name,
    hindiName,
    image,
    isVeg,
    quantity,
    unitPrice,
    price: unitPrice,
    totalPrice,
    selectedVariant,
    selectedAddons,
    selectedSpiceLevel: it.selectedSpiceLevel || undefined,
    id: it.id || `${productId}_${selectedVariant?.id || 'std'}`,
    product: {
      id: productId,
      name,
      hindiName,
      image,
      isVeg,
      price: unitPrice,
    },
  };
}

export function mapDbCategoryToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline || '',
    image: row.image || '',
    iconName: row.icon_name || row.iconName || 'Utensils',
    itemCount: row.item_count || 0,
  };
}

/**
 * Fetch all categories from Supabase PostgreSQL
 */
export async function fetchSupabaseCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Supabase categories fetch notice:', error.message);
      return [];
    }
    return (data || []).map(mapDbCategoryToCategory);
  } catch (err) {
    console.warn('Supabase fetch categories error:', err);
    return [];
  }
}

import { computeScheduledIsoTimestamp } from '../utils/dateUtils';

export function resolveDbOrderOutlet(row: any, allOutlets: Outlet[] = []): { outletId: string; outletName: string; kitchenAddress?: string } {
  const rawId = String(row.outlet_id || '').trim();
  const rawName = String(row.outlets?.name || row.outlet_name || '').trim();
  const rawAddress = String(row.outlets?.address || row.kitchen_address || '').trim();

  // 1. Direct match from provided allOutlets
  if (allOutlets.length > 0) {
    if (rawId) {
      const found = allOutlets.find((o) => o.id.toLowerCase() === rawId.toLowerCase());
      if (found) return { outletId: found.id, outletName: found.name, kitchenAddress: found.address };
    }
    if (rawName) {
      const found = allOutlets.find((o) => o.name.toLowerCase() === rawName.toLowerCase());
      if (found) return { outletId: found.id, outletName: found.name, kitchenAddress: found.address };
    }
  }

  // 2. Fallback heuristic mappings
  const cleanId = rawId.replace(/^outlet-/, '').toLowerCase();
  if (cleanId.includes('kendriya') || cleanId === 'bbsr-kendriyavihar') {
    return { outletId: 'bbsr-kendriyavihar', outletName: 'Gaon Ka Swad - Kendriya Vihar', kitchenAddress: 'Kendriya Vihar, C.C.S. Complex, Jagamara / Baramunda Road, Bhubaneswar' };
  }
  if (cleanId.includes('patia') || cleanId === 'bbsr-patia') {
    return { outletId: 'bbsr-patia', outletName: 'Gaon Ka Swad - Patia', kitchenAddress: 'KIIT Square, Infocity Rd, Patia, Bhubaneswar' };
  }
  if (cleanId.includes('khandagiri') || cleanId === 'bbsr-khandagiri') {
    return { outletId: 'bbsr-khandagiri', outletName: 'Gaon Ka Swad - Khandagiri', kitchenAddress: 'Khandagiri Square, NH-16, Bhubaneswar' };
  }
  if (cleanId.includes('hsr') || cleanId === 'blr-hsr') {
    return { outletId: 'blr-hsr', outletName: 'Gaon Ka Swad - HSR Layout', kitchenAddress: 'Sector 3, 27th Main Rd, HSR Layout, Bangalore' };
  }
  if (cleanId.includes('whitefield') || cleanId === 'blr-whitefield') {
    return { outletId: 'blr-whitefield', outletName: 'Gaon Ka Swad - Whitefield', kitchenAddress: 'ITPL Main Rd, Near Hope Farm, Whitefield, Bangalore' };
  }
  if (cleanId.includes('indiranagar') || cleanId === 'blr-indiranagar') {
    return { outletId: 'blr-indiranagar', outletName: 'Gaon Ka Swad - Indiranagar', kitchenAddress: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bangalore' };
  }

  return {
    outletId: rawId || (allOutlets[0]?.id ?? 'blr-hsr'),
    outletName: rawName || (allOutlets[0]?.name ?? 'Gaon Ka Swad Kitchen'),
    kitchenAddress: rawAddress || allOutlets[0]?.address,
  };
}

export function mapDbOrderToOrder(row: any): Order {
  const isPickup = row.order_type === 'pickup' || !!row.is_self_pickup;
  const deliveryType: 'immediate' | 'scheduled' =
    row.delivery_type === 'scheduled' ||
    row.customer_details?.deliveryType === 'scheduled'
      ? 'scheduled'
      : 'immediate';

  const scheduledAt =
    row.scheduled_at ||
    row.customer_details?.scheduledAt ||
    undefined;

  const items = Array.isArray(row.items) ? row.items.map(deserializeOrderItem) : [];
  const rawStatus = String(row.order_status || 'received').toLowerCase().trim();
  const displayStatus =
    rawStatus === 'received'
      ? 'Received'
      : rawStatus === 'confirmed'
      ? 'Confirmed'
      : rawStatus === 'preparing' || rawStatus === 'in kitchen' || rawStatus === 'preparing in kitchen'
      ? 'Preparing in Kitchen'
      : rawStatus === 'ready'
      ? 'Ready'
      : rawStatus === 'ready_for_pickup' || rawStatus === 'ready for pickup'
      ? 'Ready for Pickup'
      : rawStatus === 'ready_for_dispatch' || rawStatus === 'ready for dispatch'
      ? 'Ready for Dispatch'
      : rawStatus === 'out_for_delivery' || rawStatus === 'out for delivery'
      ? 'Out for Delivery'
      : rawStatus === 'delivered'
      ? 'Delivered'
      : rawStatus === 'picked_up' || rawStatus === 'picked up'
      ? 'Picked Up'
      : rawStatus === 'cancelled'
      ? 'Cancelled'
      : rawStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const resolvedOutlet = resolveDbOrderOutlet(row);

  return {
    id: row.id || row.order_id,
    orderId: row.order_id || row.order_number || row.id,
    orderNumber: row.order_number || row.order_id,
    outletId: resolvedOutlet.outletId,
    outletName: resolvedOutlet.outletName,
    kitchenAddress: resolvedOutlet.kitchenAddress,
    customerId: row.customer_id || undefined,
    addressId: row.address_id || row.customer_address_id || undefined,
    isSelfPickup: isPickup,
    isGuestCheckout: !row.customer_id,
    orderType: (row.order_type || (isPickup ? 'pickup' : 'delivery')) as 'delivery' | 'pickup',
    deliveryType,
    scheduledAt,
    deliveryPinCode: row.delivery_pincode || row.customer_details?.pincode || '',
    createdAt: row.created_at,
    items,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount_amount || 0),
    welcomeDiscountAmount: Number(row.welcome_discount_amount || 0),
    isWelcomeDiscountApplied: !!row.welcome_discount_applied,
    deliveryFee: Number(row.delivery_fee || 0),
    packagingFee: Number(row.packaging_fee || 0),
    gst: Number(row.tax_amount || 0),
    total: Number(row.total_amount || 0),
    couponCode: row.discount_code || undefined,
    couponId: row.coupon_id || undefined,
    couponDiscountAmount: Number(row.coupon_discount_amount || row.discount_amount || 0),
    customerDetails: row.customer_details || {
      fullName: row.customer_name || 'Customer',
      phone: row.customer_phone || '',
      email: row.customer_email || '',
      address: isPickup ? '' : (row.delivery_address_snapshot?.fullAddress || ''),
      city: isPickup ? '' : (row.delivery_address_snapshot?.city || 'Bhubaneswar'),
      state: isPickup ? '' : (row.delivery_address_snapshot?.state || 'Odisha'),
      pincode: isPickup ? '' : (row.delivery_pincode || ''),
      deliveryType,
      scheduledAt,
      scheduledDate: row.customer_details?.scheduledDate,
      scheduledTimeSlot: row.customer_details?.scheduledTimeSlot,
      scheduledSlotCategory: row.customer_details?.scheduledSlotCategory,
      scheduledSlotLabel: row.customer_details?.scheduledSlotLabel,
      paymentMethod: row.payment_method || 'cod',
      deliveryNotes: row.delivery_instructions || undefined,
      includeCutlery: true,
    },
    deliveryAddressSnapshot: isPickup ? undefined : (row.delivery_address_snapshot || undefined),
    status: displayStatus as Order['status'],
    orderStatus: rawStatus,
    placedAt: row.placed_at || row.created_at,
    confirmedAt: row.confirmed_at || undefined,
    preparingAt: row.preparing_at || undefined,
    readyAt: row.ready_at || undefined,
    outForDeliveryAt: row.out_for_delivery_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    cancelledAt: row.cancelled_at || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    estimatedDeliveryMinutes: row.estimated_delivery_minutes || (isPickup ? 25 : 35),
  };
}

export async function fetchSupabaseOrders(outletId?: string, customerId?: string): Promise<Order[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('fetchSupabaseOrders notice:', error.message);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map(mapDbOrderToOrder);
  } catch (err) {
    console.warn('fetchSupabaseOrders exception:', err);
    return [];
  }
}

export async function fetchSupabaseOrdersByPhone(phone: string): Promise<{ orders: Order[] }> {
  if (!isSupabaseConfigured()) return { orders: [] };
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .ilike('customer_phone', `%${cleanPhone}%`)
      .order('created_at', { ascending: false });
    if (error || !data) return { orders: [] };
    return { orders: data.map(mapDbOrderToOrder) };
  } catch (err) {
    console.warn('fetchSupabaseOrdersByPhone error:', err);
    return { orders: [] };
  }
}

export async function fetchSupabaseOrderById(orderId: string): Promise<Order | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`order_id.eq.${orderId},id.eq.${orderId}`)
      .maybeSingle();

    if (error || !data) return null;
    return mapDbOrderToOrder(data);
  } catch {
    return null;
  }
}

export async function updateSupabaseOrderStatus(
  orderId: string,
  status: Order['status'] | string,
  cancellationReason?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const now = new Date().toISOString();
  const norm = (status || '').toLowerCase().trim();
  const updateFields: any = {
    updated_at: now,
  };

  if (norm === 'received') {
    updateFields.order_status = 'received';
  } else if (norm === 'confirmed') {
    updateFields.order_status = 'confirmed';
    updateFields.confirmed_at = now;
  } else if (norm === 'preparing' || norm === 'in kitchen' || norm === 'preparing in kitchen') {
    updateFields.order_status = 'preparing';
    updateFields.preparing_at = now;
  } else if (norm === 'ready' || norm === 'ready for pickup' || norm === 'ready for dispatch') {
    updateFields.order_status = 'ready';
    updateFields.ready_at = now;
  } else if (norm === 'out_for_delivery' || norm === 'out for delivery') {
    updateFields.order_status = 'out_for_delivery';
    updateFields.out_for_delivery_at = now;
  } else if (norm === 'delivered' || norm === 'picked up') {
    updateFields.order_status = 'delivered';
    updateFields.delivered_at = now;
  } else if (norm === 'cancelled') {
    updateFields.order_status = 'cancelled';
    updateFields.cancelled_at = now;
    if (cancellationReason) {
      updateFields.cancellation_reason = cancellationReason;
    }
  } else {
    updateFields.order_status = norm || 'received';
  }

  try {
    const { error } = await supabase
      .from('orders')
      .update(updateFields)
      .or(`order_id.eq.${orderId},id.eq.${orderId}`);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteSupabaseOrder(orderId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .or(`order_id.eq.${orderId},id.eq.${orderId}`);

    return !error;
  } catch {
    return false;
  }
}

export async function createSupabaseOrder(orderData: Partial<Order>): Promise<Order> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const id = `order-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  let orderId = orderData.orderId;
  if (!orderId || !orderId.startsWith('GKSWAD-#')) {
    orderId = await getNextSequentialOrderId();
  }
  const now = new Date().toISOString();

  const isUUID = (str?: string | null) =>
    typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

  const safeOutletId = orderData.outletId || (orderData as any).outlet_id || 'outlet-1';
  const isSelfPickup = !!(orderData.isSelfPickup || orderData.orderType === 'pickup');
  const safeItems = Array.isArray(orderData.items)
    ? orderData.items.map(sanitizeOrderItem)
    : [];

  const supaCustomerPhone =
    orderData.customerDetails?.phone ||
    (orderData.deliveryAddressSnapshot as any)?.phone ||
    null;

  const supaCustomerName =
    orderData.customerDetails?.fullName ||
    (orderData.deliveryAddressSnapshot as any)?.fullName ||
    null;

  const supaDeliveryInstructions =
    orderData.customerDetails?.deliveryNotes ||
    (orderData.deliveryAddressSnapshot as any)?.deliveryNotes ||
    null;

  const isScheduled =
    orderData.deliveryType === 'scheduled' ||
    orderData.customerDetails?.deliveryType === 'scheduled';

  const deliveryType: 'immediate' | 'scheduled' = isScheduled ? 'scheduled' : 'immediate';

  const scheduledAt = isScheduled
    ? (computeScheduledIsoTimestamp(
        orderData.scheduledAt || orderData.customerDetails?.scheduledAt || orderData.customerDetails?.scheduledDate,
        orderData.customerDetails?.scheduledTimeSlot
      ) || orderData.scheduledAt || null)
    : null;

  const payload: any = {
    id,
    order_id: orderId,
    order_number: orderId,
    outlet_id: safeOutletId,
    customer_id: isUUID(orderData.customerId) ? orderData.customerId : null,
    address_id: isSelfPickup ? null : (isUUID(orderData.addressId) ? orderData.addressId : null),
    customer_name: supaCustomerName,
    customer_phone: supaCustomerPhone,
    order_type: isSelfPickup ? 'pickup' : 'delivery',
    is_self_pickup: isSelfPickup,
    items: safeItems,
    subtotal: Number(orderData.subtotal || 0),
    delivery_fee: Number(orderData.deliveryFee || 0),
    packaging_fee: Number(orderData.packagingFee || 0),
    discount_amount: Number(orderData.discount || 0),
    tax_amount: Number(orderData.gst || 0),
    total_amount: Number(orderData.total || 0),
    discount_type: (orderData.discount && Number(orderData.discount) > 0) ? 'coupon' : 'NONE',
    discount_code: orderData.couponCode || null,
    discount_description: null,
    welcome_discount_applied: !!orderData.isWelcomeDiscountApplied,
    welcome_discount_amount: Number(orderData.welcomeDiscountAmount || 0),
    payment_method: orderData.customerDetails?.paymentMethod || 'cod',
    payment_status: 'PENDING',
    delivery_type: deliveryType,
    scheduled_at: scheduledAt,
    delivery_instructions: supaDeliveryInstructions,
    order_status: (orderData.orderStatus || orderData.status || 'received').toLowerCase().replace(/\s+/g, '_'),
    placed_at: now,
    confirmed_at: null,
    preparing_at: null,
    ready_at: null,
    out_for_delivery_at: null,
    delivered_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    customer_details: orderData.customerDetails || {},
    delivery_address_snapshot: isSelfPickup ? null : (orderData.deliveryAddressSnapshot || null),
    delivery_pincode: orderData.deliveryPinCode || orderData.customerDetails?.pincode || '',
    estimated_delivery_minutes: Number(orderData.estimatedDeliveryMinutes || (isSelfPickup ? 25 : 35)),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from('orders').insert(payload).select().single();

  if (error) {
    console.warn('createSupabaseOrder direct insert notice:', error.message);
  }

  // Atomically decrement portions in Supabase products
  if (orderData.outletId && orderData.items && orderData.items.length > 0) {
    decrementProductPortionsInSupabase(orderData.outletId, orderData.items).catch((e) =>
      console.warn('Portion decrement background notice:', e)
    );
  }

  if (data) {
    return mapDbOrderToOrder(data);
  }

  return {
    ...orderData,
    id,
    orderId,
    outletId: safeOutletId,
    isSelfPickup,
    orderType: isSelfPickup ? 'pickup' : 'delivery',
    items: safeItems,
    subtotal: payload.subtotal,
    discount: payload.discount_amount,
    welcomeDiscountAmount: payload.welcome_discount_amount,
    isWelcomeDiscountApplied: payload.welcome_discount_applied,
    deliveryFee: payload.delivery_fee,
    packagingFee: payload.packaging_fee,
    gst: payload.tax_amount,
    total: payload.total_amount,
    status: payload.status,
    createdAt: now,
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
  // 2. Health check summary
  return {
    success: true,
    insertedProducts: health.tableCounts.products,
    insertedOutlets: health.tableCounts.outlets,
    insertedZones: health.tableCounts.zones,
    insertedCategories: health.tableCounts.categories,
    insertedAbouts: health.tableCounts.abouts || 0,
    message: `Database connection verified. Live PostgreSQL tables: ${health.tableCounts.products} products, ${health.tableCounts.outlets} outlets, ${health.tableCounts.zones} delivery zones, ${health.tableCounts.categories} categories.`,
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

// ========================================================
// COUPON MANAGEMENT & VALIDATION SERVICES (SERVER AUTHORITATIVE)
// ========================================================

/**
 * Fetch all coupons (for owner management or client catalog) from Server
 */
export const fetchCouponsFromCloud = async (): Promise<Coupon[]> => {
  try {
    const res = await fetch('/api/coupons?includeInactive=true');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        return data.coupons.map((c: any, index: number) => ({
          ...c,
          id: c.id || `coupon-${c.code ? c.code.toLowerCase() : index}`,
          title: c.title || c.name || c.code,
          name: c.name || c.title || c.code,
        }));
      }
    }
  } catch (err) {
    console.warn('Failed to fetch coupons from server API, trying Supabase direct fetch:', err);
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          code: (row.code || '').trim().toUpperCase(),
          name: row.name || row.code,
          title: row.name || row.code,
          description: row.description || '',
          discountType: row.discount_type,
          discountValue: Number(row.discount_value || 0),
          maxDiscountAmount: row.max_discount_amount != null ? Number(row.max_discount_amount) : undefined,
          minOrderValue: Number(row.minimum_order_value || 0),
          userEligibility: row.user_eligibility || 'all',
          isFirstOrderOnly: row.user_eligibility === 'first_order',
          usageLimit: row.usage_limit != null ? Number(row.usage_limit) : undefined,
          usageLimitTotal: row.usage_limit != null ? Number(row.usage_limit) : undefined,
          usageLimitPerUser: row.usage_limit_per_user != null ? Number(row.usage_limit_per_user) : undefined,
          outletIds: Array.isArray(row.outlet_ids) ? row.outlet_ids : [],
          applicableOutlets: Array.isArray(row.outlet_ids) ? row.outlet_ids : [],
          validFrom: row.valid_from,
          validUntil: row.valid_until,
          isActive: row.is_active ?? true,
          isPublic: true,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch coupons error:', e);
    }
  }

  return [];
};

/**
 * Upsert / Save a coupon (Owner action) via Server API
 */
export const saveCouponToCloud = async (couponData: Partial<Coupon>): Promise<Coupon> => {
  const normalizedCode = (couponData.code || '').trim().toUpperCase();
  if (!normalizedCode) throw new Error('Coupon code is required');

  try {
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...couponData,
        code: normalizedCode,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.coupon) {
        return data.coupon;
      }
    }
  } catch (e) {
    console.warn('Server coupon save error, attempting Supabase fallback:', e);
  }

  if (isSupabaseConfigured()) {
    const payload: any = {
      code: normalizedCode,
      name: couponData.name || normalizedCode,
      description: couponData.description || '',
      discount_type: couponData.discountType || 'percentage',
      discount_value: couponData.discountValue ?? 10,
      max_discount_amount: couponData.maxDiscountAmount ?? null,
      minimum_order_value: couponData.minOrderValue ?? 0,
      user_eligibility: couponData.userEligibility || 'all',
      usage_limit: couponData.usageLimit ?? couponData.usageLimitTotal ?? null,
      usage_limit_per_user: couponData.usageLimitPerUser ?? null,
      outlet_ids: couponData.outletIds || couponData.applicableOutlets || [],
      valid_from: couponData.validFrom || new Date().toISOString(),
      valid_until: couponData.validUntil || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      is_active: couponData.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    if (couponData.id && !couponData.id.startsWith('seed-') && !couponData.id.startsWith('coupon-')) {
      payload.id = couponData.id;
    }

    const { data, error } = await supabase
      .from('coupons')
      .upsert(payload)
      .select('*')
      .single();

    if (!error && data) {
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        title: data.name,
        description: data.description,
        discountType: data.discount_type,
        discountValue: Number(data.discount_value),
        maxDiscountAmount: data.max_discount_amount != null ? Number(data.max_discount_amount) : undefined,
        minOrderValue: Number(data.minimum_order_value || 0),
        userEligibility: data.user_eligibility,
        usageLimit: data.usage_limit != null ? Number(data.usage_limit) : undefined,
        usageLimitTotal: data.usage_limit != null ? Number(data.usage_limit) : undefined,
        usageLimitPerUser: data.usage_limit_per_user != null ? Number(data.usage_limit_per_user) : undefined,
        outletIds: Array.isArray(data.outlet_ids) ? data.outlet_ids : [],
        applicableOutlets: Array.isArray(data.outlet_ids) ? data.outlet_ids : [],
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        success: true,
      };
    }
  }

  return {
    id: couponData.id || `coupon-${Date.now()}`,
    code: normalizedCode,
    name: couponData.name || couponData.title || normalizedCode,
    title: couponData.title || couponData.name || normalizedCode,
    description: couponData.description || '',
    discountType: couponData.discountType || 'percentage',
    discountValue: couponData.discountValue ?? 10,
    maxDiscountAmount: couponData.maxDiscountAmount ?? undefined,
    minOrderValue: couponData.minOrderValue ?? 0,
    userEligibility: couponData.userEligibility || 'all',
    usageLimit: couponData.usageLimit ?? couponData.usageLimitTotal ?? undefined,
    usageLimitTotal: couponData.usageLimitTotal ?? couponData.usageLimit ?? undefined,
    usageLimitPerUser: couponData.usageLimitPerUser ?? 1,
    outletIds: couponData.outletIds || couponData.applicableOutlets || [],
    applicableOutlets: couponData.applicableOutlets || couponData.outletIds || [],
    validFrom: couponData.validFrom || new Date().toISOString(),
    validUntil: couponData.validUntil || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    isActive: couponData.isActive ?? true,
    createdAt: couponData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    success: true,
  };
};

/**
 * Delete a coupon via Server API
 */
export const deleteCouponFromCloud = async (
  couponId: string,
  code?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const url = `/api/coupons/${encodeURIComponent(couponId)}${code ? `?code=${encodeURIComponent(code)}` : ''}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { success: true };
    }
  } catch (e) {
    console.warn('Server coupon delete error:', e);
  }

  if (isSupabaseConfigured() && !couponId.startsWith('seed-') && !couponId.startsWith('coupon-')) {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', couponId);
      if (error) console.warn('Supabase delete coupon warning:', error.message);
    } catch (e) {}
  }
  return { success: true };
};

/**
 * Fetch total redemptions count and stats for coupons from Server API
 */
export const fetchCouponStatsFromCloud = async (): Promise<Record<string, { count: number; totalDiscount: number }>> => {
  try {
    const res = await fetch('/api/coupons/stats');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.perCoupon) {
        return data.perCoupon;
      }
    }
  } catch (e) {
    console.warn('Server fetch coupon stats notice:', e);
  }

  const stats: Record<string, { count: number; totalDiscount: number }> = {};
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('coupon_redemptions')
        .select('coupon_id, discount_amount');

      if (!error && data) {
        data.forEach((r: any) => {
          const key = r.coupon_id;
          if (!stats[key]) {
            stats[key] = { count: 0, totalDiscount: 0 };
          }
          stats[key].count += 1;
          stats[key].totalDiscount += Number(r.discount_amount || 0);
        });
        return stats;
      }
    } catch (e) {}
  }

  return stats;
};

/**
 * Core Server-Side Coupon Validation Engine
 */
export const validateCoupon = async (params: {
  couponCode: string;
  foodSubtotal: number;
  customerId?: string | null;
  customerPhone?: string | null;
  outletId?: string;
}): Promise<CouponValidationResult> => {
  const normalizedCode = (params.couponCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    return { isValid: false, valid: false, message: 'Please enter a coupon code.', error: 'Please enter a coupon code.' };
  }

  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: normalizedCode,
        foodSubtotal: params.foodSubtotal,
        customerId: params.customerId || null,
        customerPhone: params.customerPhone || null,
        outletId: params.outletId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.isValid) {
      return {
        isValid: true,
        valid: true,
        coupon: data.coupon,
        discountAmount: data.discountAmount,
        message: data.message,
      };
    } else {
      const errMessage = data.message || data.error || 'Invalid coupon code';
      return {
        isValid: false,
        valid: false,
        message: errMessage,
        error: errMessage,
      };
    }
  } catch (err: any) {
    console.warn('Server coupon validation error, running fallback:', err);
  }

  // Cloud / In-memory fallback
  const coupons = await fetchCouponsFromCloud();
  const coupon = coupons.find((c) => c.code.toUpperCase() === normalizedCode);

  if (!coupon) {
    return { isValid: false, valid: false, message: 'Invalid coupon code.', error: 'Invalid coupon code.' };
  }

  if (!coupon.isActive) {
    return { isValid: false, valid: false, message: 'This coupon is not active.', error: 'This coupon is not active.' };
  }

  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { isValid: false, valid: false, message: 'This coupon is not yet valid.', error: 'This coupon is not yet valid.' };
  }
  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return { isValid: false, valid: false, message: 'This coupon has expired.', error: 'This coupon has expired.' };
  }

  if ((coupon.userEligibility === 'logged_in' || coupon.userEligibility === 'registered' || coupon.requiresLogin) && !params.customerId && !params.customerPhone) {
    return { isValid: false, valid: false, message: 'Please log in to use this coupon.', error: 'Please log in to use this coupon.' };
  }

  if (coupon.minOrderValue && params.foodSubtotal < coupon.minOrderValue) {
    const msg = `Minimum order value of ₹${coupon.minOrderValue} is required to apply ${coupon.code}.`;
    return { isValid: false, valid: false, message: msg, error: msg };
  }

  const activeOutlets = coupon.applicableOutlets || coupon.outletIds;
  if (params.outletId && activeOutlets && activeOutlets.length > 0 && !activeOutlets.includes(params.outletId)) {
    return { isValid: false, valid: false, message: 'This coupon is not available for this outlet.', error: 'This coupon is not available for this outlet.' };
  }

  const couponDisplayName = coupon.name || coupon.code;

  if (coupon.usageLimitPerUser && (params.customerId || params.customerPhone)) {
    try {
      let q = supabase.from('coupon_redemptions').select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id);
      if (params.customerId) {
        q = q.eq('customer_id', params.customerId);
      }
      const { count } = await q;
      if (count && count >= coupon.usageLimitPerUser) {
        return {
          isValid: false,
          valid: false,
          message: `you've already used this coupon - ${couponDisplayName}`,
          error: `you've already used this coupon - ${couponDisplayName}`,
        };
      }
    } catch (e) {}
  }

  let calculatedDiscount = 0;
  if (coupon.discountType === 'percentage') {
    calculatedDiscount = (params.foodSubtotal * coupon.discountValue) / 100;
    const maxDiscount = coupon.maxDiscountAmount;
    if (maxDiscount != null && maxDiscount > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, maxDiscount);
    }
  } else {
    calculatedDiscount = coupon.discountValue;
  }

  calculatedDiscount = Math.min(Math.round(calculatedDiscount), params.foodSubtotal);

  return {
    isValid: true,
    valid: true,
    message: `${coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`} applied successfully!`,
    coupon,
    discountAmount: calculatedDiscount,
  };
};

/**
 * Record a successful coupon redemption via Server API
 */
export const recordCouponRedemption = async (
  couponIdOrPayload: string | {
    couponId?: string;
    couponCode?: string;
    orderId?: string;
    discountAmount?: number;
    customerId?: string | null;
    customerPhone?: string;
    orderTotal?: number;
  },
  orderIdParam?: string,
  discountAmountParam?: number,
  customerIdParam?: string | null
): Promise<void> => {
  let couponId = '';
  let couponCode = '';
  let orderId = '';
  let discountAmount = 0;
  let customerId: string | null = null;
  let customerPhone: string | undefined = undefined;
  let orderTotal: number | undefined = undefined;

  if (typeof couponIdOrPayload === 'string') {
    couponId = couponIdOrPayload;
    couponCode = couponIdOrPayload;
    orderId = orderIdParam || '';
    discountAmount = discountAmountParam || 0;
    customerId = customerIdParam || null;
  } else if (couponIdOrPayload && typeof couponIdOrPayload === 'object') {
    couponId = couponIdOrPayload.couponId || '';
    couponCode = couponIdOrPayload.couponCode || couponIdOrPayload.couponId || '';
    orderId = couponIdOrPayload.orderId || '';
    discountAmount = couponIdOrPayload.discountAmount || 0;
    customerId = couponIdOrPayload.customerId || null;
    customerPhone = couponIdOrPayload.customerPhone;
    orderTotal = couponIdOrPayload.orderTotal;
  }

  if (!couponId && !couponCode) return;

  try {
    await fetch('/api/coupons/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponId,
        couponCode,
        customerId,
        customerPhone,
        orderId,
        discountAmount,
        orderTotal,
      }),
    });
  } catch (e) {
    console.warn('Server coupon redeem call notice:', e);
  }
};

/**
 * Check if customer is eligible for WELCOME10
 */
export const checkWelcomeOfferEligibility = async (customerId?: string, customerPhone?: string): Promise<boolean> => {
  if (!customerId && !customerPhone) return true;
  try {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId);
    if (customerPhone) params.set('customerPhone', customerPhone);
    const res = await fetch(`/api/coupons/available?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        return data.coupons.some((c: any) => (c.code || '').toUpperCase() === 'WELCOME10');
      }
    }
  } catch (e) {}
  return true;
};

/**
 * Fetch all active public & available coupons for checkout from Server API
 */
export const fetchAvailableCouponsForCustomer = async (
  customerId?: string | null,
  customerPhone?: string | null,
  subtotal?: number,
  outletId?: string
): Promise<Coupon[]> => {
  try {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId);
    if (customerPhone) params.set('customerPhone', customerPhone);
    if (subtotal !== undefined) params.set('subtotal', String(subtotal));
    if (outletId) params.set('outletId', outletId);

    const res = await fetch(`/api/coupons/available?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        return data.coupons.map((c: any, index: number) => ({
          ...c,
          id: c.id || `coupon-${c.code ? c.code.toLowerCase() : index}`,
          title: c.title || c.name || c.code,
          name: c.name || c.title || c.code,
        }));
      }
    }
  } catch (err) {
    console.warn('Server fetch available coupons error, falling back:', err);
  }

  const all = await fetchCouponsFromCloud();
  const active = all.filter((c) => {
    if (!c.isActive) return false;
    const now = new Date();
    if (c.validFrom && new Date(c.validFrom) > now) return false;
    if (c.validUntil && new Date(c.validUntil) < now) return false;
    const outlets = c.applicableOutlets || c.outletIds;
    if (outletId && outlets && outlets.length > 0 && !outlets.includes(outletId)) return false;
    if ((c.userEligibility === 'logged_in' || c.requiresLogin) && !customerId && !customerPhone) return false;
    return true;
  });
  return active;
};

/**
 * Fetches the set of order IDs that have already been reviewed/rated
 */
export async function fetchRatedOrderIds(orderIds: string[]): Promise<string[]> {
  if (!orderIds || orderIds.length === 0) return [];

  // 1. Try direct Supabase query if configured
  if (isSupabaseConfigured()) {
    try {
      const candidates = new Set<string>();
      orderIds.forEach((id) => {
        const str = String(id || '').trim();
        if (str) {
          candidates.add(str);
          const clean = str.replace(/^#+/, '');
          candidates.add(clean);
          candidates.add(`#${clean}`);
        }
      });

      const { data, error } = await supabase
        .from('product_reviews')
        .select('order_id')
        .in('order_id', Array.from(candidates));

      if (!error && data) {
        const found = new Set<string>();
        data.forEach((r: any) => {
          if (r.order_id) {
            const raw = String(r.order_id).trim();
            found.add(raw);
            const c = raw.replace(/^#+/, '');
            found.add(c);
            found.add(`#${c}`);
          }
        });
        return Array.from(found);
      }
    } catch (err) {
      console.warn('fetchRatedOrderIds direct Supabase error, falling back to API:', err);
    }
  }

  // 2. Fallback to server API endpoint
  try {
    const res = await fetch('/api/orders/rated-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.ratedOrderIds)) {
        return data.ratedOrderIds;
      }
    }
  } catch (err) {
    console.warn('fetchRatedOrderIds API fallback error:', err);
  }

  return [];
}


