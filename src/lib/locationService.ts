import { Outlet, DeliveryZone, Product } from '../types';
import { INITIAL_OUTLETS, INITIAL_DELIVERY_ZONES } from '../data/outlets';
import {
  fetchSupabaseOutlets,
  createSupabaseOutlet,
  updateSupabaseOutlet,
  toggleSupabaseOutletActive,
  deleteSupabaseOutlet,
  fetchSupabaseZones,
  createSupabaseZone,
  updateSupabaseZone,
  toggleSupabaseZoneActive,
  deleteSupabaseZone,
  createSupabaseOrder,
} from './supabaseService';
import { isSupabaseConfigured } from './supabase';

const OUTLETS_CACHE_KEY = 'gaonkaswad_outlets_cache_v1';
const ZONES_CACHE_KEY = 'gaonkaswad_zones_cache_v1';

let cachedOutlets: Outlet[] = [];
let cachedZones: DeliveryZone[] = [];

// Initialize memory cache from localStorage if available, or fallback to INITIAL
function initLocalCache() {
  try {
    if (typeof window !== 'undefined') {
      const savedOutlets = localStorage.getItem(OUTLETS_CACHE_KEY);
      if (savedOutlets) {
        cachedOutlets = JSON.parse(savedOutlets);
      } else {
        cachedOutlets = [...INITIAL_OUTLETS];
      }

      const savedZones = localStorage.getItem(ZONES_CACHE_KEY);
      if (savedZones) {
        cachedZones = JSON.parse(savedZones);
      } else {
        cachedZones = [...INITIAL_DELIVERY_ZONES];
      }
    } else {
      cachedOutlets = [...INITIAL_OUTLETS];
      cachedZones = [...INITIAL_DELIVERY_ZONES];
    }
  } catch (e) {
    cachedOutlets = [...INITIAL_OUTLETS];
    cachedZones = [...INITIAL_DELIVERY_ZONES];
  }
}

initLocalCache();

function updateLocalCache(outlets?: Outlet[], zones?: DeliveryZone[]) {
  if (outlets) {
    cachedOutlets = outlets;
    try {
      localStorage.setItem(OUTLETS_CACHE_KEY, JSON.stringify(outlets));
    } catch {}
  }
  if (zones) {
    cachedZones = zones;
    try {
      localStorage.setItem(ZONES_CACHE_KEY, JSON.stringify(zones));
    } catch {}
  }
}

/**
 * 1. getOutlets - fetch all outlets (optionally include inactive for owner)
 */
export async function getOutlets(includeInactive = false, token?: string): Promise<Outlet[]> {
  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const supaOutlets = await fetchSupabaseOutlets(includeInactive);
      if (Array.isArray(supaOutlets) && supaOutlets.length > 0) {
        updateLocalCache(supaOutlets);
        return supaOutlets;
      }
    } catch (err) {
      console.warn('Supabase outlets fetch failed, trying fallback API:', err);
    }
  }

  // 2. Fallback to API
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = includeInactive ? '/api/outlets?includeInactive=true' : '/api/outlets';
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.outlets)) {
        if (includeInactive) {
          updateLocalCache(data.outlets);
        } else {
          // Merge active outlets into cache without erasing existing inactive outlets
          const existingMap = new Map(cachedOutlets.map((o) => [o.id, o]));
          data.outlets.forEach((o: Outlet) => existingMap.set(o.id, o));
          updateLocalCache(Array.from(existingMap.values()));
        }
        return data.outlets;
      }
    }
  } catch (err) {
    console.warn('API getOutlets failed, using local cache:', err);
  }

  return includeInactive ? cachedOutlets : cachedOutlets.filter((o) => o.isActive);
}

/**
 * 2. getOutletById - fetch single outlet by unique ID
 */
export function getOutletById(id: string, outletsList: Outlet[] = cachedOutlets): Outlet | undefined {
  return outletsList.find((o) => o.id === id);
}

/**
 * 3. getActiveOutlets - get all active outlets
 */
export function getActiveOutlets(outletsList: Outlet[] = cachedOutlets): Outlet[] {
  return outletsList.filter((o) => o.isActive);
}

/**
 * 4. getOutletsByCity - filter outlets by city
 */
export function getOutletsByCity(city?: string, outletsList: Outlet[] = cachedOutlets): Outlet[] {
  if (!city) return [];
  const cleanCity = (city || '').trim().toLowerCase();
  return (outletsList || []).filter((o) => (o?.city || '').trim().toLowerCase() === cleanCity && o?.isActive);
}

/**
 * 5. getDeliveryZones - fetch all delivery zones
 */
export async function getDeliveryZones(includeInactive = false, token?: string): Promise<DeliveryZone[]> {
  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const supaZones = await fetchSupabaseZones(includeInactive);
      if (Array.isArray(supaZones) && supaZones.length > 0) {
        updateLocalCache(undefined, supaZones);
        return supaZones;
      }
    } catch (err) {
      console.warn('Supabase zones fetch failed, trying fallback API:', err);
    }
  }

  // 2. Fallback to API
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = includeInactive ? '/api/delivery-zones?includeInactive=true' : '/api/delivery-zones';
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.zones)) {
        updateLocalCache(undefined, data.zones);
        return data.zones;
      }
    }
  } catch (err) {
    console.warn('API getDeliveryZones failed, using local cache:', err);
  }

  return includeInactive ? cachedZones : cachedZones.filter((z) => z.isActive);
}

/**
 * 6. getDeliveryZoneByPinCode - find active zone matching PIN code
 */
export function getDeliveryZoneByPinCode(
  pinCode?: string,
  zonesList: DeliveryZone[] = cachedZones
): DeliveryZone | undefined {
  if (!pinCode) return undefined;
  const cleanPin = pinCode.trim();
  if (!cleanPin) return undefined;
  return (zonesList || []).find((z) => z?.isActive && (z.pinCodes || []).includes(cleanPin));
}

/**
 * 7. getOutletForPinCode - resolves the physical outlet for a given PIN code
 */
export function getOutletForPinCode(
  pinCode: string,
  outletsList: Outlet[] = cachedOutlets,
  zonesList: DeliveryZone[] = cachedZones
): Outlet | undefined {
  const zone = getDeliveryZoneByPinCode(pinCode, zonesList);
  if (!zone) return undefined;
  const outlet = getOutletById(zone.outletId, outletsList);
  if (!outlet || !outlet.isActive) return undefined;
  return outlet;
}

/**
 * 8. getProductOutletConfig - retrieves specific outlet configuration for a product
 */
export function getProductOutletConfig(product: Product, outletId?: string) {
  if (!outletId) return undefined;
  if (product.outlets && Array.isArray(product.outlets)) {
    return product.outlets.find((o) => o.outletId === outletId);
  }
  return undefined;
}

/**
 * 9. isProductServedAtOutlet - checks if product is served at all in this outlet
 */
export function isProductServedAtOutlet(product: Product, outletId?: string): boolean {
  if (!outletId) return true;
  if (!product) return false;

  // 1. Check explicit outlet config on product
  if (product.outlets && Array.isArray(product.outlets) && product.outlets.length > 0) {
    if (product.outlets.some((o) => o.outletId === outletId)) {
      return true;
    }
  }

  // 2. Check outletIds array on product
  if (product.outletIds && Array.isArray(product.outletIds) && product.outletIds.length > 0) {
    if (product.outletIds.includes(outletId)) {
      return true;
    }
  }

  // 3. Check outlet's assignedProductIds list
  const outlet = cachedOutlets.find((o) => o.id === outletId);
  if (outlet && Array.isArray(outlet.assignedProductIds) && outlet.assignedProductIds.length > 0) {
    const prodIdStr = String(product.id);
    return outlet.assignedProductIds.some((id) => String(id) === prodIdStr);
  }

  // 4. If product has empty outlet restrictions
  if (
    (!product.outlets || product.outlets.length === 0) &&
    (!product.outletIds || product.outletIds.length === 0)
  ) {
    return true;
  }

  return false;
}

/**
 * 10. isProductInStockAtOutlet - checks if product is in stock at the outlet
 */
export function isProductInStockAtOutlet(product: Product, outletId?: string): boolean {
  if (product.inStock === false) return false;
  if (!outletId) return true;
  if (product.outlets && Array.isArray(product.outlets)) {
    const config = product.outlets.find((o) => o.outletId === outletId);
    if (config) {
      return config.inStock !== false;
    }
  }
  // Fallback to legacy inStock
  return true;
}

/**
 * 11. isProductFeaturedAtOutlet - checks if product is marked as featured in this outlet
 */
export function isProductFeaturedAtOutlet(product: Product, outletId?: string): boolean {
  if (!outletId) {
    return (
      product.featured === true ||
      (product.outlets && product.outlets.some((o) => o.isFeatured))
    );
  }
  if (product.outlets && Array.isArray(product.outlets)) {
    const config = product.outlets.find((o) => o.outletId === outletId);
    if (config) return !!config.isFeatured;
  }
  return !!product.featured;
}

/**
 * 12. isProductBestsellerAtOutlet - checks if product is marked as bestseller in this outlet
 */
export function isProductBestsellerAtOutlet(product: Product, outletId?: string): boolean {
  if (!outletId) {
    return (
      product.bestseller === true ||
      (product.outlets && product.outlets.some((o) => o.isBestseller))
    );
  }
  if (product.outlets && Array.isArray(product.outlets)) {
    const config = product.outlets.find((o) => o.outletId === outletId);
    if (config) return !!config.isBestseller;
  }
  return !!product.bestseller;
}

/**
 * 13. isProductChefSpecialAtOutlet - checks if product is marked as chef's special in this outlet
 */
export function isProductChefSpecialAtOutlet(product: Product, outletId?: string): boolean {
  if (!product) return false;
  if (!outletId) {
    return Array.isArray(product.outlets)
      ? product.outlets.some((o) => !!o.isChefSpecial)
      : false;
  }
  if (Array.isArray(product.outlets)) {
    const config = product.outlets.find((o) => o.outletId === outletId);
    if (config) return !!config.isChefSpecial;
  }
  return false;
}

/**
 * 13. getProductsForOutlet - filters products by outlet assignment
 */
export function getProductsForOutlet(products: Product[], outletId: string): Product[] {
  if (!outletId) return products;
  return products.filter((p) => isProductServedAtOutlet(p, outletId));
}

/**
 * 14. isProductAvailableAtOutlet - checks if a single product is served at an outlet
 */
export function isProductAvailableAtOutlet(
  productOrId: Product | string | number,
  outletId: string,
  allProductsList?: Product[]
): boolean {
  if (!outletId) return true;

  let product: Product | undefined;
  if (typeof productOrId === 'object') {
    product = productOrId;
  } else if (allProductsList) {
    product = allProductsList.find((p) => String(p.id) === String(productOrId));
  }

  if (!product) return true;
  return isProductServedAtOutlet(product, outletId);
}

/**
 * 10. getDeliveryFee - returns delivery fee for PIN code
 */
export function getDeliveryFee(
  pinCode: string,
  zonesList: DeliveryZone[] = cachedZones
): number {
  const zone = getDeliveryZoneByPinCode(pinCode, zonesList);
  return zone ? zone.deliveryFee : 40;
}

/**
 * 11. getMinimumOrderValue - returns minimum order value for PIN code
 */
export function getMinimumOrderValue(
  pinCode: string,
  zonesList: DeliveryZone[] = cachedZones,
  outletsList: Outlet[] = cachedOutlets
): number {
  const zone = getDeliveryZoneByPinCode(pinCode, zonesList);
  if (!zone) return 0;
  const outlet = getOutletById(zone.outletId, outletsList);
  return outlet?.minimumOrderValue || 0;
}

/**
 * 12. checkPinCodeOnline - live database & API verification with rich error messages
 */
export async function checkPinCodeOnline(pinCode: string): Promise<{
  available: boolean;
  outlet?: Outlet;
  zone?: DeliveryZone;
  deliveryFee?: number;
  minimumOrderValue?: number;
  error?: string;
}> {
  const cleanPin = pinCode.trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      available: false,
      error: 'Please enter a valid 6-digit Indian PIN code',
    };
  }

  // 1. Direct Supabase Database Check (if configured)
  if (isSupabaseConfigured()) {
    try {
      const [supaZones, supaOutlets] = await Promise.all([
        fetchSupabaseZones(true),
        fetchSupabaseOutlets(true),
      ]);

      if (Array.isArray(supaZones) && supaZones.length > 0) {
        updateLocalCache(supaOutlets, supaZones);

        const matchingZone = supaZones.find(
          (z) =>
            z.isActive &&
            Array.isArray(z.pinCodes) &&
            z.pinCodes.some((p) => String(p).trim() === cleanPin)
        );

        if (matchingZone) {
          const matchingOutlet = supaOutlets.find((o) => o.id === matchingZone.outletId);
          if (matchingOutlet && matchingOutlet.isActive) {
            return {
              available: true,
              outlet: matchingOutlet,
              zone: matchingZone,
              deliveryFee: matchingZone.deliveryFee ?? matchingOutlet.deliveryFee ?? 40,
              minimumOrderValue: matchingOutlet.minimumOrderValue || 200,
            };
          } else if (matchingOutlet && !matchingOutlet.isActive) {
            return {
              available: false,
              error: `Our kitchen outlet (${matchingOutlet.name}) serving PIN code ${cleanPin} is temporarily closed.`,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Direct Supabase PIN check error, checking API/cache:', err);
    }
  }

  // 2. Node Backend API check
  try {
    const res = await fetch(`/api/delivery-zones/check/${cleanPin}`);
    if (res.ok) {
      const data = await res.json();
      if (data.available && data.outlet && data.zone) {
        return {
          available: true,
          outlet: data.outlet,
          zone: data.zone,
          deliveryFee: data.zone?.deliveryFee ?? (data.outlet?.deliveryFee ?? 40),
          minimumOrderValue: data.outlet?.minimumOrderValue ?? 200,
        };
      }
    }
  } catch (e) {
    console.warn('Live PIN check API failed, checking local data:', e);
  }

  // 3. Fallback to local cached data
  const zone = getDeliveryZoneByPinCode(cleanPin, cachedZones);
  if (!zone) {
    return {
      available: false,
      error: `Delivery is currently not available for PIN code ${cleanPin}. We are expanding to new areas soon!`,
    };
  }

  const outlet = getOutletById(zone.outletId, cachedOutlets);
  if (!outlet || !outlet.isActive) {
    return {
      available: false,
      error: `Our kitchen outlet serving PIN code ${cleanPin} is temporarily closed.`,
    };
  }

  return {
    available: true,
    outlet,
    zone,
    deliveryFee: zone.deliveryFee,
    minimumOrderValue: outlet.minimumOrderValue || 200,
  };
}

// Owner API Helpers

export async function createOutletApi(outletData: Partial<Outlet>, token: string): Promise<Outlet> {
  if (isSupabaseConfigured()) {
    try {
      const created = await createSupabaseOutlet(outletData);
      const updatedOutlets = [...cachedOutlets.filter((o) => o.id !== created.id), created];
      updateLocalCache(updatedOutlets);
      try {
        fetch('/api/outlets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(outletData),
        }).catch(() => {});
      } catch {}
      return created;
    } catch (err) {
      console.warn('Supabase createOutlet error, falling back to API:', err);
    }
  }

  const res = await fetch('/api/outlets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(outletData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create outlet');
  }

  // Preserve existing active and inactive outlets in local cache
  const updatedOutlets = [...cachedOutlets.filter((o) => o.id !== data.outlet.id), data.outlet];
  updateLocalCache(updatedOutlets);

  return data.outlet;
}

export async function updateOutletApi(id: string, outletData: Partial<Outlet>, token: string): Promise<Outlet> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await updateSupabaseOutlet(id, outletData);
      const updatedOutlets = cachedOutlets.map((o) => (o.id === id ? updated : o));
      updateLocalCache(updatedOutlets);
      try {
        fetch(`/api/outlets/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(outletData),
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase updateOutlet error, falling back to API:', err);
    }
  }

  const res = await fetch(`/api/outlets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(outletData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update outlet');
  }

  const updatedOutlets = cachedOutlets.map((o) => (o.id === id ? data.outlet : o));
  updateLocalCache(updatedOutlets);

  return data.outlet;
}

export async function toggleOutletActiveApi(id: string, token: string): Promise<Outlet> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await toggleSupabaseOutletActive(id);
      const updatedOutlets = cachedOutlets.map((o) => (o.id === id ? updated : o));
      updateLocalCache(updatedOutlets);
      try {
        fetch(`/api/outlets/${id}/toggle-active`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase toggleOutletActive error, falling back to API:', err);
    }
  }

  const res = await fetch(`/api/outlets/${id}/toggle-active`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to toggle outlet active state');
  }

  const updatedOutlets = cachedOutlets.map((o) => (o.id === id ? data.outlet : o));
  updateLocalCache(updatedOutlets);

  return data.outlet;
}

export async function deleteOutletApi(id: string, token: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseOutlet(id);
      const updatedOutlets = cachedOutlets.filter((o) => o.id !== id);
      const updatedZones = cachedZones.filter((z) => z.outletId !== id);
      updateLocalCache(updatedOutlets, updatedZones);
      try {
        fetch(`/api/outlets/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      } catch {}
      return true;
    } catch (err) {
      console.warn('Supabase deleteOutlet error, falling back to API:', err);
    }
  }

  const res = await fetch(`/api/outlets/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete outlet');
  }

  const updatedOutlets = cachedOutlets.filter((o) => o.id !== id);
  const updatedZones = cachedZones.filter((z) => z.outletId !== id);
  updateLocalCache(updatedOutlets, updatedZones);

  return true;
}

export async function createZoneApi(
  zoneData: Partial<DeliveryZone> & { transferConflicts?: boolean },
  token: string
): Promise<DeliveryZone> {
  if (isSupabaseConfigured()) {
    try {
      const created = await createSupabaseZone(zoneData);
      const updatedZones = [...cachedZones.filter((z) => z.id !== created.id), created];
      updateLocalCache(undefined, updatedZones);
      try {
        fetch('/api/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(zoneData),
        }).catch(() => {});
      } catch {}
      return created;
    } catch (err) {
      console.warn('Supabase createZone error, falling back to API:', err);
    }
  }

  const res = await fetch('/api/delivery-zones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(zoneData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create delivery zone');
  }
  return data.zone;
}

export async function updateZoneApi(
  id: string,
  zoneData: Partial<DeliveryZone> & { transferConflicts?: boolean },
  token: string
): Promise<DeliveryZone> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await updateSupabaseZone(id, zoneData);
      const updatedZones = cachedZones.map((z) => (z.id === id ? updated : z));
      updateLocalCache(undefined, updatedZones);
      try {
        fetch(`/api/delivery-zones/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(zoneData),
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase updateZone error, falling back to API:', err);
    }
  }

  const res = await fetch(`/api/delivery-zones/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(zoneData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update delivery zone');
  }
  return data.zone;
}

export async function toggleZoneActiveApi(id: string, token: string): Promise<DeliveryZone> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await toggleSupabaseZoneActive(id);
      const updatedZones = cachedZones.map((z) => (z.id === id ? updated : z));
      updateLocalCache(undefined, updatedZones);
      try {
        fetch(`/api/delivery-zones/${id}/toggle-active`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase toggleZoneActive error, falling back to API:', err);
    }
  }

  const res = await fetch(`/api/delivery-zones/${id}/toggle-active`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to toggle delivery zone active state');
  }
  return data.zone;
}

export async function deleteZoneApi(id: string, token: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseZone(id);
      const updatedZones = cachedZones.filter((z) => z.id !== id);
      updateLocalCache(undefined, updatedZones);
      try {
        fetch(`/api/delivery-zones/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      } catch {}
      return true;
    } catch (err) {
      console.warn('Supabase deleteZone error, falling back to API:', err);
    }
  }

  const res = await fetch(`/api/delivery-zones/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete delivery zone');
  }
  return true;
}

export async function createOrderApi(orderData: any): Promise<any> {
  if (isSupabaseConfigured()) {
    try {
      const created = await createSupabaseOrder(orderData);
      try {
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        }).catch(() => {});
      } catch {}
      return created;
    } catch (err) {
      console.warn('Supabase createOrder error, falling back to API:', err);
    }
  }

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit order');
  }
  return data.order;
}
