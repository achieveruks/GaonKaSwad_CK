import React, { createContext, useContext, useState, useEffect } from 'react';
import { OwnerUser } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  ownerUser: OwnerUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'gaonkaswad_owner_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setToken(savedToken);
            setOwnerUser(data.user);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setOwnerUser(null);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setOwnerUser(null);
        }
      } catch (err) {
        console.error('Failed to verify owner session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid email or password. Please try again.',
        };
      }

      const newToken = data.token;
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setOwnerUser(data.user);
      return { success: true };
    } catch (err: any) {
      console.error('Login request failed:', err);
      return {
        success: false,
        error: 'Network error. Could not connect to authentication server.',
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn('Logout request error:', err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setOwnerUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        token,
        ownerUser,
        login,
        logout,
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
