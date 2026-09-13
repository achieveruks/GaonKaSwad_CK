import React, { createContext, useContext, useState, useEffect } from 'react';
import { OwnerUser, Profile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchCurrentProfile, fetchUserProfile } from '../lib/supabaseService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  ownerUser: OwnerUser | null;
  profile: Profile | null;
  authProvider: 'supabase' | null;
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authProvider, setAuthProvider] = useState<'supabase' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    if (isSupabaseConfigured()) {
      try {
        const prof = await fetchCurrentProfile();
        if (prof) {
          setProfile(prof);
          setOwnerUser({
            id: prof.id,
            email: prof.email || '',
            role: prof.role,
            name: prof.fullName,
            outletId: prof.outletId,
            isSupabaseAuth: true,
          });
        }
      } catch (e) {
        console.warn('refreshProfile warning:', e);
      }
    }
  };

  // 1. Initial Session Check: Strictly check Supabase session
  useEffect(() => {
    let isMounted = true;

    const checkInitialAuth = async () => {
      setIsLoading(true);

      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user && isMounted) {
            const userEmail = session.user.email || '';
            const prof = await fetchCurrentProfile();
            const role: UserRole = prof?.role || (userEmail.toLowerCase() === 'achieveruks@gmail.com' ? 'owner' : 'customer');

            setToken(session.access_token);
            setProfile(prof);
            setAuthProvider('supabase');
            setOwnerUser({
              id: session.user.id,
              email: userEmail,
              role,
              name: prof?.fullName || session.user.user_metadata?.full_name || userEmail.split('@')[0],
              outletId: prof?.outletId,
              isSupabaseAuth: true,
            });
          } else if (isMounted) {
            setToken(null);
            setOwnerUser(null);
            setProfile(null);
            setAuthProvider(null);
          }
        } catch (sbErr) {
          console.warn('Supabase session check error:', sbErr);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    checkInitialAuth();

    // 2. Listen to Supabase Auth state changes
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session && session.user) {
          const userEmail = session.user.email || '';
          const prof = await fetchCurrentProfile();
          const role: UserRole = prof?.role || (userEmail.toLowerCase() === 'achieveruks@gmail.com' ? 'owner' : 'customer');

          setToken(session.access_token);
          setProfile(prof);
          setAuthProvider('supabase');
          setOwnerUser({
            id: session.user.id,
            email: userEmail,
            role,
            name: prof?.fullName || session.user.user_metadata?.full_name || userEmail.split('@')[0],
            outletId: prof?.outletId,
            isSupabaseAuth: true,
          });
        } else if (event === 'SIGNED_OUT') {
          setToken(null);
          setOwnerUser(null);
          setProfile(null);
          setAuthProvider(null);
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  /**
   * Pure Supabase Sign In with Role Verification (No Server Fallback)
   */
  const login = async (
    email: string,
    password: string,
    expectedRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase credentials are not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Invalid login credentials in Supabase Auth.',
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: 'Authentication failed: No active session was created.',
        };
      }

      // Fetch Profile from public.profiles table
      let prof = await fetchCurrentProfile();
      const isAchiever = cleanEmail === 'achieveruks@gmail.com';
      let role: UserRole = prof?.role || (isAchiever ? 'owner' : 'customer');

      // Auto-heal / fallback: If profile was missing or defaulted to customer for manager emails
      if (role === 'customer' && (cleanEmail.startsWith('manager.') || cleanEmail.includes('manager')) && cleanEmail.endsWith('@gaonkaswad.in')) {
        try {
          let derivedOutletId: string | null = null;
          if (cleanEmail.includes('hsr')) derivedOutletId = 'blr-hsr';
          else if (cleanEmail.includes('kadabeesan')) derivedOutletId = 'blr-kadabeesanhalli';
          else if (cleanEmail.includes('kvbbsr') || cleanEmail.includes('kendriya')) derivedOutletId = 'bbsr-kendriyavihar';
          else if (cleanEmail.includes('indiranagar')) derivedOutletId = 'blr-indiranagar';
          else if (cleanEmail.includes('whitefield')) derivedOutletId = 'blr-whitefield';
          else if (cleanEmail.includes('patia')) derivedOutletId = 'bbsr-patia';
          else if (cleanEmail.includes('khandagiri')) derivedOutletId = 'bbsr-khandagiri';

          await supabase
            .from('profiles')
            .update({
              role: 'outlet_manager',
              outlet_id: derivedOutletId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.user.id);

          prof = await fetchCurrentProfile();
          if (prof?.role) {
            role = prof.role;
          }
        } catch (healErr) {
          console.warn('Auto-heal manager profile warning:', healErr);
        }
      }

      // STRICT ROLE VERIFICATION FOR /#/owner/login
      // 1. Customer accounts can NEVER log into the staff/owner portal
      if (role === 'customer' && !isAchiever) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access Denied: This account has role "customer". Customer accounts cannot log in to the Owner & Manager portal. Please contact the administrator.',
        };
      }

      // 2. If Outlet Manager role is expected, verify that the user is an outlet manager or owner
      if (expectedRole === 'outlet_manager' && role !== 'outlet_manager' && role !== 'owner' && !isAchiever) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Access Denied: This account is registered with role "${role}", not "outlet_manager". Outlet Manager privileges required.`,
        };
      }

      // 3. If Owner role is expected, verify that the user is an owner
      if (expectedRole === 'owner' && role !== 'owner' && !isAchiever) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Access Denied: This account is registered with role "${role}", not "owner". Store Owner privileges required.`,
        };
      }

      setToken(data.session.access_token);
      setProfile(prof);
      setAuthProvider('supabase');
      setOwnerUser({
        id: data.user.id,
        email: cleanEmail,
        role,
        name: prof?.fullName || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        outletId: prof?.outletId,
        isSupabaseAuth: true,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Supabase login exception:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during Supabase login.',
      };
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setToken(null);
      setOwnerUser(null);
      setProfile(null);
      setAuthProvider(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token || !!ownerUser,
        isLoading,
        token,
        ownerUser,
        profile,
        authProvider,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


