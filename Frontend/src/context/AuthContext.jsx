import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authService from '../services/auth.js';

const AuthContext = createContext(null);

/**
 * Wraps the app and exposes the current auth state + actions.
 *
 * The session lives entirely in the httpOnly "token" cookie the backend
 * sets — this context never sees, stores, or caches that token or any
 * stand-in for it (no localStorage) since the frontend has no way to
 * read an httpOnly cookie anyway. On mount, it calls
 * GET /users/restoreSession, which the browser automatically sends the
 * cookie along with: a 2xx response means the cookie is still valid and
 * carries the current user, anything else means there's no session and
 * the user needs to log in. This runs once per full page load.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const restoredUser = await authService.restoreSession();
        if (!cancelled) setUser(restoredUser);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const signup = useCallback(async (payload) => {
    const newUser = await authService.signup(payload);
    setUser(newUser);
    return newUser;
  }, []);

  const login = useCallback(async (payload) => {
    const loggedInUser = await authService.login(payload);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    if (!user?.id) throw new Error('Not logged in.');
    const updatedUser = await authService.updateProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!user?.id) throw new Error('Not logged in.');
    await authService.deleteAccount();
    setUser(null);
  }, [user]);

  const value = {
    user,
    isAuthenticated: !!user,
    initializing,
    signup,
    login,
    logout,
    updateProfile,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
