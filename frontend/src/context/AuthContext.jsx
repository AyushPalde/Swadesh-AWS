/**
 * Authentication Context & Provider
 * Manages user session, JWT token, role, and persistent auth state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin } from '../api/auth.js';
import { clearSession, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../api/client.js';
import { ROLES } from '../constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync session on mount / storage events
  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === TOKEN_STORAGE_KEY) {
        setToken(e.newValue);
      }
      if (e.key === USER_STORAGE_KEY) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const result = await apiLogin(credentials);
      setToken(result.token);
      setUser(result.user);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    role: user?.role || ROLES.CITIZEN,
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

