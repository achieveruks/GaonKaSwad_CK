import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials (can be overridden by environment variables)
const DEFAULT_SUPABASE_URL = 'https://ifthfunawntmqjupafxp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGhmdW5hd250bXFqdXBhZnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjc4NTQsImV4cCI6MjEwMjgwMzg1NH0.xS74LsNci-I_v-p13O3rzzhflOuOZaHLDcVLgEi9Yzw';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('your-project') &&
    SUPABASE_ANON_KEY.length > 20
  );
};

// Global singleton Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
