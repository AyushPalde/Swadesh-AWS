
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import client from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        const response = await client.get('/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || response.user?.name || '',
          role: response.user?.role || 'citizen',
        });
      } catch (error) {
        console.error('Profile loading failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    const profile = await client.get('/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const currentUser = {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName || profile.user?.name || '',
      role: profile.user?.role || 'citizen',
    };
    setUser(currentUser);
    return { user: currentUser };
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const token = await result.user.getIdToken();

    const profile = await client.post('/register', { name }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const currentUser = {
      uid: result.user.uid,
      email: result.user.email,
      name,
      role: profile.user?.role || 'citizen',
    };
    setUser(currentUser);
    return { user: currentUser };
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null,
        isAuthenticated: Boolean(user),
        role: user?.role || 'citizen',
        isLoading,
        login,
        register,
        logout,
      }}
    >
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
