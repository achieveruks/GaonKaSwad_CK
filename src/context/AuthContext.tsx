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
      const role: UserRole = prof?.role || (isAchiever ? 'owner' : 'customer');

      // If expectedRole was selected on the login page, verify authorization
      if (expectedRole && expectedRole !== role && !isAchiever) {
        // If they requested 'owner' but are only manager or customer
        if (expectedRole === 'owner' && role !== 'owner') {
          await supabase.auth.signOut();
          return {
            success: false,
            error: `Access Denied: This account is registered as "${role}", not "owner". Please contact your administrator.`,
          };
        }
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


