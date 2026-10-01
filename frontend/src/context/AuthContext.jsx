import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY_ROLE = 'cropshield_role';

function createProfile(role) {
  if (role === 'officer') {
    return {
      role: 'officer',
      name: 'Agricultural Officer',
      district: 'Kolar & Chikkaballapur',
      jurisdiction: 'Kolar, Chikkaballapur & Bengaluru Rural',
    };
  }
  return {
    role: 'farmer',
    name: 'Farmer',
    district: 'Kolar',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedRole = localStorage.getItem(STORAGE_KEY_ROLE);
      if (storedRole === 'farmer' || storedRole === 'officer') {
        return createProfile(storedRole);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync state across browser tabs if needed
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_ROLE) {
        if (e.newValue === 'farmer' || e.newValue === 'officer') {
          setUser(createProfile(e.newValue));
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const selectRole = useCallback((role) => {
    const validRole = role === 'officer' ? 'officer' : 'farmer';
    const profile = createProfile(validRole);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, validRole);
    } catch {}
    setUser(profile);
    return profile;
  }, []);

  // Backwards-compatible login method for role-selection
  const login = useCallback(async (credentials = {}) => {
    setIsLoading(true);
    try {
      const targetRole = credentials.role === 'officer' ? 'officer' : 'farmer';
      return selectRole(targetRole);
    } finally {
      setIsLoading(false);
    }
  }, [selectRole]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user?.role),
    isFarmer: user?.role === 'farmer',
    isOfficer: user?.role === 'officer',
    isLoading,
    selectRole,
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

