import { FestiveEvent, FestiveOverviewSummary, FestiveProductionItemSummary } from '../types';
import {
  fetchSupabaseFestiveEvents,
  fetchSupabaseFestiveEventById,
  createSupabaseFestiveEvent,
  updateSupabaseFestiveEvent,
  deleteSupabaseFestiveEvent,
  mapDbFestiveEventToFestiveEvent,
} from './supabaseService';
import { isSupabaseConfigured } from './supabase';

const API_BASE = '/api';

function getAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch all festive events, optionally filtered by outlet and status
 */
export async function getFestiveEvents(
  outletId?: string,
  onlyActive = false,
  token?: string
): Promise<FestiveEvent[]> {
  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const data = await fetchSupabaseFestiveEvents(outletId, onlyActive);
      if (data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch festive events failed, falling back to API:', err);
    }
  }

  // 2. Fallback to backend API
  try {
    const params = new URLSearchParams();
    if (outletId) params.append('outletId', outletId);
    if (onlyActive) params.append('active', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/festive-events${queryString}`, {
      headers: getAuthHeaders(token),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.festiveEvents)) {
        return json.festiveEvents.map(mapDbFestiveEventToFestiveEvent);
      }
    }
  } catch (apiErr) {
    console.warn('API fetch festive events failed:', apiErr);
  }

  return [];
}

/**
 * Fetch a single festive event by ID
 */
export async function getFestiveEventById(id: string, token?: string): Promise<FestiveEvent | null> {
  if (!id) return null;

  if (isSupabaseConfigured()) {
    try {
      const ev = await fetchSupabaseFestiveEventById(id);
      if (ev) return ev;
    } catch (err) {
      console.warn('Supabase fetch festive event by id failed:', err);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/festive-events/${encodeURIComponent(id)}`, {
      headers: getAuthHeaders(token),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.festiveEvent) {
        return mapDbFestiveEventToFestiveEvent(json.festiveEvent);
      }
    }
  } catch (err) {
    console.warn('API fetch festive event by id failed:', err);
  }

  return null;
}

/**
 * Create a new festive event (single authoritative write to avoid duplicate DB rows)
 */
export async function createFestiveEvent(
  eventData: Partial<FestiveEvent>,
  token?: string
): Promise<FestiveEvent> {
  if (isSupabaseConfigured()) {
    try {
      const created = await createSupabaseFestiveEvent(eventData);
      if (created) return created;
    } catch (err) {
      console.warn('Supabase create festive event failed, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/festive-events`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(eventData),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok && json.success && json.festiveEvent) {
    return mapDbFestiveEventToFestiveEvent(json.festiveEvent);
  }

  throw new Error(json.error || 'Failed to create festive event collection');
}

/**
 * Update an existing festive event (single authoritative write)
 */
export async function updateFestiveEvent(
  id: string,
  eventData: Partial<FestiveEvent>,
  token?: string
): Promise<FestiveEvent> {
  if (isSupabaseConfigured()) {
    try {
      const updated = await updateSupabaseFestiveEvent(id, eventData);
      if (updated) return updated;
    } catch (err) {
      console.warn('Supabase update festive event failed, falling back to API:', err);
    }
  }

  const res = await fetch(`${API_BASE}/festive-events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(eventData),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok && json.success && json.festiveEvent) {
    return mapDbFestiveEventToFestiveEvent(json.festiveEvent);
  }

  throw new Error(json.error || 'Failed to update festive event');
}

/**
 * Delete a festive event (guards against deleting events with confirmed bookings)
 */
export async function deleteFestiveEvent(id: string, token?: string): Promise<boolean> {
  let deletedFromSupabase = false;

  if (isSupabaseConfigured()) {
    try {
      deletedFromSupabase = await deleteSupabaseFestiveEvent(id);
    } catch (err: any) {
      // Propagate explicit safety guard message if bookings exist
      if (err.message && err.message.includes('confirmed bookings')) {
        throw err;
      }
      console.warn('Supabase delete festive event error:', err);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/festive-events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    if (res.ok) {
      const json = await res.json();
      return !!json.success;
    }
    const errorData = await res.json().catch(() => ({}));
    if (!deletedFromSupabase) {
      throw new Error(errorData.error || 'Failed to delete festival collection.');
    }
  } catch (apiErr: any) {
    if (deletedFromSupabase) return true;
    throw apiErr;
  }

  return deletedFromSupabase;
}

/**
 * Fetch aggregated production planning summary for an outlet and festive event
 */
export async function getFestiveProductionSummary(
  outletId: string,
  eventId: string,
  token?: string
): Promise<{
  success: boolean;
  festiveEventId: string;
  outletId: string;
  totalBookedUnits: number;
  totalExtraBuffer?: number;
  totalKitchenPrep?: number;
  specialPackagingUnits?: number;
  items: FestiveProductionItemSummary[];
}> {
  const res = await fetch(
    `${API_BASE}/outlets/${encodeURIComponent(outletId)}/festive-events/${encodeURIComponent(eventId)}/summary`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Failed to load festive production summary');
  }

  return json;
}

/**
 * Fetch cross-event live Utsav production overview (owner: all or filtered outlet, manager: assigned outlet only)
 */
export async function getFestiveOverview(
  outletId?: string,
  token?: string
): Promise<FestiveOverviewSummary> {
  const query = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  const res = await fetch(`${API_BASE}/festive-events/overview${query}`, {
    headers: getAuthHeaders(token),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to load Utsav production overview');
  }

  return json.overview;
}

/**
 * Update extra buffer portions, convert surplus stock to normal listing, or delist/relist a festive dish at an outlet
 */
export async function updateFestiveProductStock(
  outletId: string,
  eventId: string,
  productId: string,
  payload: {
    action: 'update_buffer' | 'convert_to_normal' | 'delist' | 'relist';
    extraPlanned?: number;
  },
  token?: string
): Promise<{
  success: boolean;
  portionsLeft: number;
  inStock: boolean;
  availabilityMode: 'normal' | 'prebook_only';
}> {
  const res = await fetch(
    `${API_BASE}/outlets/${encodeURIComponent(outletId)}/festive-events/${encodeURIComponent(eventId)}/products/${encodeURIComponent(productId)}/stock`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update festive production stock');
  }

  return json;
}

/**
 * Idempotently sync pre-book dishes whose festive event deadline has passed
 * into Normal Listing with 0 portions (Sold Out) while keeping festiveProduct flag intact.
 */
export async function syncClosedFestiveProducts(): Promise<{
  success: boolean;
  updatedCount: number;
  updatedProductIds: string[];
}> {
  try {
    const res = await fetch(`${API_BASE}/festive-events/sync-closed-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      return {
        success: !!json.success,
        updatedCount: Number(json.updatedCount || 0),
        updatedProductIds: Array.isArray(json.updatedProductIds) ? json.updatedProductIds : [],
      };
    }
  } catch (err) {
    console.warn('Closed festive product sync notice:', err);
  }
  return { success: false, updatedCount: 0, updatedProductIds: [] };
}

