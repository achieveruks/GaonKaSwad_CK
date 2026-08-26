import { Product, DashboardStats } from '../types';
import { PRODUCTS as FALLBACK_PRODUCTS } from '../data/products';
import {
  fetchSupabaseProducts,
  fetchSupabaseProductBySlug,
  createSupabaseProduct,
  updateSupabaseProduct,
  deleteSupabaseProduct,
  toggleSupabaseProductActive,
  toggleSupabaseProductStock,
  updateSupabaseOutletProductConfig,
  batchUpdateSupabaseOutletProducts,
} from './supabaseService';
import { isSupabaseConfigured } from './supabase';

const API_BASE = '/api';

/**
 * Helper to get authorization headers if token exists
 */
function getAuthHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch all products from Supabase PostgreSQL (with fallback to API / initial data)
 */
export async function getProducts(includeInactive = false, token?: string): Promise<Product[]> {
  // 1. Try Supabase PostgreSQL first
  if (isSupabaseConfigured()) {
    try {
      const supaProducts = await fetchSupabaseProducts(includeInactive);
      if (Array.isArray(supaProducts) && supaProducts.length > 0) {
        return supaProducts;
      }
    } catch (err) {
      console.warn('Supabase products fetch failed or empty, trying fallback API:', err);
    }
  }

  // 2. Fallback to server API
  try {
    const url = includeInactive ? `${API_BASE}/products?includeInactive=true` : `${API_BASE}/products`;
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.products)) {
      return data.products;
    }
    return FALLBACK_PRODUCTS;
  } catch (err) {
    console.warn('Error fetching products from API, using fallback data:', err);
    return FALLBACK_PRODUCTS.map((p) => ({
      ...p,
      active: p.active !== false,
      inStock: p.inStock !== false,
    }));
  }
}

/**
 * Fetch a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const product = await fetchSupabaseProductBySlug(slug);
      if (product) return product;
    } catch (err) {
      console.warn('Supabase fetch product by slug failed, trying fallback API:', err);
    }
  }

  // 2. Fallback to API
  try {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch product: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.success && data.product) {
      return data.product;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching product by slug, using fallback search:', err);
    const cleanSlug = (slug || '').toLowerCase().trim();
    const found = FALLBACK_PRODUCTS.find((p) => (p?.slug || '').toLowerCase() === cleanSlug);
    return found || null;
  }
}

/**
 * Create a new product (Owner action)
 */
export async function createProduct(productData: Partial<Product>, token: string): Promise<Product> {
  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const created = await createSupabaseProduct(productData);
      // Also notify server storage in background if available
      try {
        fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: getAuthHeaders(token),
          body: JSON.stringify(productData),
        }).catch(() => {});
      } catch {}
      return created;
    } catch (err) {
      console.warn('Supabase product creation error, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(productData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create product');
  }

  return data.product;
}

/**
 * Update an existing product (Owner action)
 */
export async function updateProduct(
  id: string | number,
  productData: Partial<Product>,
  token: string
): Promise<Product> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await updateSupabaseProduct(id, productData);
      try {
        fetch(`${API_BASE}/products/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify(productData),
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase product update error, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(productData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update product');
  }

  return data.product;
}

/**
 * Delete a product (Owner action)
 */
export async function deleteProduct(id: string | number, token: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await deleteSupabaseProduct(id);
      try {
        fetch(`${API_BASE}/products/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(token),
        }).catch(() => {});
      } catch {}
      return true;
    } catch (err) {
      console.warn('Supabase product delete error, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete product');
  }

  return true;
}

/**
 * Toggle product active status (Owner action)
 */
export async function toggleProductActive(id: string | number, token: string): Promise<Product> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await toggleSupabaseProductActive(id);
      try {
        fetch(`${API_BASE}/products/${id}/toggle-active`, {
          method: 'PATCH',
          headers: getAuthHeaders(token),
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase toggle active error, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/products/${id}/toggle-active`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to toggle active status');
  }

  return data.product;
}

/**
 * Toggle product stock status (Owner action)
 */
export async function toggleProductStock(id: string | number, token: string): Promise<Product> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await toggleSupabaseProductStock(id);
      try {
        fetch(`${API_BASE}/products/${id}/toggle-stock`, {
          method: 'PATCH',
          headers: getAuthHeaders(token),
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase toggle stock error, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/products/${id}/toggle-stock`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to toggle stock status');
  }

  return data.product;
}

/**
 * Update single product configuration for a specific outlet (Owner action)
 */
export async function updateOutletProductConfig(
  outletId: string,
  productId: string | number,
  config: { inStock?: boolean; isFeatured?: boolean; isBestseller?: boolean; isChefSpecial?: boolean; isAssigned?: boolean; portionsLeft?: number | null },
  token: string
): Promise<Product> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await updateSupabaseOutletProductConfig(outletId, productId, config);
      try {
        fetch(`${API_BASE}/outlets/${outletId}/products/${productId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(token),
          body: JSON.stringify(config),
        }).catch(() => {});
      } catch {}
      return updated;
    } catch (err) {
      console.warn('Supabase update outlet config error, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/outlets/${outletId}/products/${productId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(config),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update product for outlet');
  }

  return data.product;
}

/**
 * Batch update products configuration for an outlet (Owner action)
 */
export async function batchUpdateOutletProducts(
  outletId: string,
  updates: {
    productId: string | number;
    isAssigned?: boolean;
    inStock?: boolean;
    isFeatured?: boolean;
    isBestseller?: boolean;
    isChefSpecial?: boolean;
    portionsLeft?: number | null;
  }[],
  token: string
): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    try {
      const supaUpdated = await batchUpdateSupabaseOutletProducts(outletId, updates);
      // Fire-and-forget sync to Node backend storage
      try {
        fetch(`${API_BASE}/outlets/${outletId}/products`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ updates }),
        }).catch(() => {});
      } catch {}
      return supaUpdated;
    } catch (err) {
      console.warn('Supabase batch update failed, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/outlets/${outletId}/products`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ updates }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update outlet products');
  }

  return data.products;
}

/**
 * Get dashboard metrics (Owner action)
 */
export async function getDashboardStats(token: string): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_BASE}/stats`, {
      headers: getAuthHeaders(token),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stats) {
        return data.stats;
      }
    }
  } catch (err) {
    console.warn('API getDashboardStats failed, calculating from client catalog:', err);
  }

  // Graceful fallback computed stats if API unavailable
  return {
    totalProducts: FALLBACK_PRODUCTS.length,
    activeProducts: FALLBACK_PRODUCTS.filter((p) => p.active !== false).length,
    outOfStockProducts: FALLBACK_PRODUCTS.filter((p) => p.inStock === false).length,
    featuredProducts: FALLBACK_PRODUCTS.filter((p) => p.featured && p.active !== false).length,
    bestsellerProducts: FALLBACK_PRODUCTS.filter((p) => p.bestseller && p.active !== false).length,
  };
}

