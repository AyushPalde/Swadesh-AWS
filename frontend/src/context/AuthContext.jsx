import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'swadesh_demo_user';

function readStoredUser() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = useCallback(async ({ role }) => {
    if (!['citizen', 'authority'].includes(role)) {
      throw new Error('Choose a valid demo account.');
    }
    const nextUser = role === 'authority'
      ? { uid: 'demo-authority-001', email: 'authority@swadesh.demo', name: 'Demo Authority', role: 'authority' }
      : { uid: 'demo-citizen-001', email: 'citizen@swadesh.demo', name: 'Demo Citizen', role: 'citizen' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return { user: nextUser };
  }, []);

  const register = useCallback(async () => {
    throw new Error('Registration is disabled in classroom demo mode. Use a demo account.');
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token: null,
      isAuthenticated: Boolean(user),
      role: user?.role || 'citizen',
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
