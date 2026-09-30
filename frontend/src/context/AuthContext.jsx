import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_USER = 'cropshield_auth_user';
const STORAGE_KEY_TOKEN = 'cropshield_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync state across browser tabs if needed
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_USER) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(credentials);
      const authenticatedUser = res?.user || null;
      const token = res?.token || '';

      if (authenticatedUser) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authenticatedUser));
      }
      if (token) {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
      }

      setUser(authenticatedUser);
      return authenticatedUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } finally {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isFarmer: user?.role === 'farmer',
    isOfficer: user?.role === 'officer',
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
