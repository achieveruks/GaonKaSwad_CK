import { OutletAbout } from '../types';
import { fetchSupabaseAboutByOutletId, upsertSupabaseAbout } from './supabaseService';
import { isSupabaseConfigured } from './supabase';

/**
 * Pure fetch from Supabase database (with backend API fallback)
 * Returns the exact record from the database, or null if not yet configured.
 */
export async function getAboutByOutletId(outletId: string): Promise<OutletAbout | null> {
  if (!outletId) return null;

  // 1. Direct Supabase Query
  if (isSupabaseConfigured()) {
    try {
      const supaAbout = await fetchSupabaseAboutByOutletId(outletId);
      if (supaAbout) {
        return supaAbout;
      }
    } catch (err) {
      console.warn(`Supabase query for abouts (outlet: ${outletId}) failed:`, err);
    }
  }

  // 2. Direct Server API Fallback
  try {
    const res = await fetch(`/api/outlets/${outletId}/about`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.about) {
        return data.about;
      }
    }
  } catch (err) {
    console.warn(`API /api/outlets/${outletId}/about failed:`, err);
  }

  return null;
}

/**
 * Saves or updates About page configuration for an outlet directly in Supabase
 */
export async function saveAboutByOutletId(
  outletId: string,
  aboutData: Partial<OutletAbout>,
  token?: string
): Promise<OutletAbout> {
  if (!outletId) throw new Error('outletId is required to save about configuration');

  let savedRecord: OutletAbout | null = null;
  let lastError: string | null = null;

  // 1. Save directly to Supabase
  if (isSupabaseConfigured()) {
    try {
      savedRecord = await upsertSupabaseAbout({
        ...aboutData,
        outletId,
      });
    } catch (err: any) {
      lastError = err?.message || 'Supabase about save failed';
      console.warn('Supabase upsertSupabaseAbout error:', err);
    }
  }

  // 2. Sync to Server API
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/outlets/${outletId}/about`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ...aboutData, outletId }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.about) {
      if (!savedRecord) savedRecord = data.about;
    } else if (!savedRecord && !res.ok) {
      lastError = data.error || lastError || 'Server API failed to save about configuration';
    }
  } catch (err: any) {
    if (!savedRecord) {
      lastError = err?.message || lastError || 'Network error while saving about configuration';
    }
    console.warn('Server API save about failed:', err);
  }

  if (savedRecord) return savedRecord;

  throw new Error(lastError || 'Failed to save outlet About & Utsav promo configuration');
}
