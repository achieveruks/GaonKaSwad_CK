import { FestiveEvent, FestiveProductionItemSummary } from '../types';
import {
  fetchSupabaseFestiveEvents,
  fetchSupabaseFestiveEventById,
  createSupabaseFestiveEvent,
  updateSupabaseFestiveEvent,
  deleteSupabaseFestiveEvent,
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
    if (onlyActive) params.append('status', 'active');
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/festive-events${queryString}`, {
      headers: getAuthHeaders(token),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.festiveEvents)) {
        return json.festiveEvents;
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
        return json.festiveEvent;
      }
    }
  } catch (err) {
    console.warn('API fetch festive event by id failed:', err);
  }

  return null;
}

/**
 * Create a new festive event
 */
export async function createFestiveEvent(
  eventData: Partial<FestiveEvent>,
  token?: string
): Promise<FestiveEvent> {
  let created: FestiveEvent | null = null;

  if (isSupabaseConfigured()) {
    try {
      created = await createSupabaseFestiveEvent(eventData);
    } catch (err) {
      console.warn('Supabase create festive event failed, falling back to API:', err);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/festive-events`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(created || eventData),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.festiveEvent) {
        return json.festiveEvent;
      }
    }
  } catch (apiErr) {
    console.warn('API create festive event sync error:', apiErr);
  }

  if (created) return created;
  throw new Error('Failed to create festive event collection');
}

/**
 * Update an existing festive event
 */
export async function updateFestiveEvent(
  id: string,
  eventData: Partial<FestiveEvent>,
  token?: string
): Promise<FestiveEvent> {
  let updated: FestiveEvent | null = null;

  if (isSupabaseConfigured()) {
    try {
      updated = await updateSupabaseFestiveEvent(id, eventData);
    } catch (err) {
      console.warn('Supabase update festive event failed, falling back to API:', err);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/festive-events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(updated || eventData),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.festiveEvent) {
        return json.festiveEvent;
      }
    }
  } catch (apiErr) {
    console.warn('API update festive event sync error:', apiErr);
  }

  if (updated) return updated;
  throw new Error('Failed to update festive event');
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
    if (errorData.error) {
      throw new Error(errorData.error);
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
  items: FestiveProductionItemSummary[];
}> {
  const res = await fetch(
    `${API_BASE}/outlets/${encodeURIComponent(outletId)}/festive-events/${encodeURIComponent(eventId)}/summary`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!res.ok) {
    throw new Error('Failed to load festive production summary');
  }

  return res.json();
}

