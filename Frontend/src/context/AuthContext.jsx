import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as authService from '../services/auth.js';
import { getErrorMessage } from '../utils/errors.js';

const AuthContext = createContext(null);

// Paths where knowing "is there a valid session?" actually matters enough
// to justify the GET /users/restoreSession call on load/refresh:
//  - "/" and "/account" are ProtectedRoute pages — they need the answer
//    to decide whether to render the page or bounce to /login.
//  - "/login" needs the answer too, but for the opposite reason: if the
//    cookie is actually still valid, it should skip the form and send the
//    person straight in instead of making them log in again.
// Everywhere else (/signup, any unknown "*" 404 path, etc.) doesn't
// gate on auth at all, so there's nothing to restore for — calling the
// endpoint there was pure waste and, worse, its result was silently
// discarded (this is the bug being fixed here).
const RESTORE_SESSION_PATHS = new Set(['/', '/login', '/account']);

// Exported so SessionGate can avoid showing a stale offline/error screen
// on a route that never actually triggered (or cares about) the restore
// check in the first place — e.g. navigating from an offline /login to
// /signup shouldn't drag the offline screen along with it.
export function isSessionGatedPath(pathname) {
  return RESTORE_SESSION_PATHS.has(pathname);
}

/**
 * Wraps the app and exposes the current auth state + actions.
 *
 * The session lives entirely in the httpOnly "token" cookie the backend
 * sets — this context never sees, stores, or caches that token or any
 * stand-in for it (no localStorage) since the frontend has no way to
 * read an httpOnly cookie anyway. GET /users/restoreSession is how it
 * finds out whether that cookie is still valid: a 2xx response means
 * yes (and carries the current user), anything else means there's no
 * usable session.
 *
 * This only runs once per full page load, and only on the routes where
 * the answer is actually acted on (see RESTORE_SESSION_PATHS above) —
 * it re-checks if the person navigates (via the router, not a full
 * reload) from a non-gated path onto one of those, e.g. clicking a link
 * from /signup to /login.
 *
 * A failed restore isn't always "you're just logged out" — it could be a
 * network/server-down failure (no `err.response` at all), an expired
 * token, an invalid/tampered token, or something else the backend sent a
 * specific `error` string for. `sessionError` (and a coarser
 * `sessionErrorKind`) captures which one, so the login page can show the
 * right message instead of silently landing on a blank login form.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts as "not initializing" — flips to true only when a restore
  // check is actually about to run (see the effect below), so a route
  // that never calls restoreSession (e.g. /signup, an unknown "*" path)
  // isn't stuck waiting on a request that will never fire.
  const [initializing, setInitializing] = useState(RESTORE_SESSION_PATHS.has(window.location.pathname));
  const [sessionError, setSessionError] = useState(null); // human-readable string, or null
  const [sessionErrorKind, setSessionErrorKind] = useState(null); // 'offline' | 'expired' | 'invalid' | 'other' | null
  const [hasChecked, setHasChecked] = useState(false); // has a restore check actually run yet at all?

  const location = useLocation();

  // Shared by the route-driven effect and the manual "Try again" retry
  // (see retryRestoreSession below) so both go through the exact same
  // success/failure classification logic, and so a successful restore
  // on /login actually takes effect (fixes the "response arrives but
  // nothing happens" bug) — the caller (LoginPage) reads `user` /
  // `isAuthenticated` off context after this resolves and redirects.
  const runRestoreSession = useCallback(async ({ signal } = {}) => {
    try {
      const restoredUser = await authService.restoreSession();
      if (signal?.aborted) return;
      setUser(restoredUser);
      setSessionError(null);
      setSessionErrorKind(null);
    } catch (err) {
      if (signal?.aborted) return;
      setUser(null);

      // No `response` at all means the request never got a reply from
      // the server — DNS failure, connection refused, timeout, CORS
      // preflight rejection, etc. This is the "backend isn't running"
      // case specifically, distinct from a 401 (server IS running, and
      // is actively saying "this session isn't valid"). This case is
      // deliberately NOT treated like the others: SessionGate keeps the
      // user on a dedicated "can't reach the server" screen instead of
      // sending them to /login, since a login form is misleading when
      // the problem isn't the session at all.
      if (err?.request && !err?.response) {
        setSessionErrorKind('offline');
        setSessionError("Can't reach the server. Please check your connection or try again later.");
        return;
      }

      // The backend's authUser middleware distinguishes these two 401
      // cases with different `error` strings ("Session expired" vs
      // "Invalid Session" / "User not logged in or invalid token") —
      // getErrorMessage() already pulls that string out for us.
      const message = getErrorMessage(err, '');
      const status = err?.response?.status;

      if (status === 401 && /expired/i.test(message)) {
        setSessionErrorKind('expired');
        setSessionError('Your session has expired. Please log in again.');
      } else if (status === 401) {
        setSessionErrorKind('invalid');
        setSessionError(message || 'Your session is invalid. Please log in again.');
      } else if (status) {
        // Server responded, but with something other than the expected
        // 401 (e.g. a 500) — still worth surfacing rather than pretending
        // it's a normal "not logged in" state.
        setSessionErrorKind('other');
        setSessionError(message || 'Something went wrong checking your session. Please log in again.');
      } else {
        setSessionErrorKind('other');
        setSessionError(message || 'Could not restore your session. Please log in again.');
      }
    } finally {
      if (!signal?.aborted) {
        setInitializing(false);
        setHasChecked(true);
      }
    }
  }, []);

  useEffect(() => {
    // Only call the backend when landing (or navigating, via the router)
    // on a path that actually gates on auth. A path change to a
    // non-gated route (e.g. /signup) or an already-checked gated route
    // doesn't re-trigger this.
    if (!RESTORE_SESSION_PATHS.has(location.pathname)) return;
    if (hasChecked) return;

    setInitializing(true);
    const controller = new AbortController();
    runRestoreSession({ signal: controller.signal });
    return () => controller.abort();
  }, [location.pathname, hasChecked, runRestoreSession]);

  // Lets the offline screen (SessionGate) offer a "Try again" button
  // without a full page reload. Re-enters the same `initializing` state
  // briefly so the loading animation shows again while it retries.
  const retryRestoreSession = useCallback(async () => {
    setInitializing(true);
    setHasChecked(false);
    await runRestoreSession();
  }, [runRestoreSession]);

  const signup = useCallback(async (payload) => {
    const newUser = await authService.signup(payload);
    setUser(newUser);
    return newUser;
  }, []);

  const login = useCallback(async (payload) => {
    const loggedInUser = await authService.login(payload);
    setUser(loggedInUser);
    // A successful manual login supersedes whatever caused the earlier
    // silent restore to fail (expired/invalid session, backend having
    // been briefly down, etc.) — clear it so it doesn't linger and get
    // shown again later (e.g. after a subsequent logout).
    setSessionError(null);
    setSessionErrorKind(null);
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
    hasCheckedSession: hasChecked,
    sessionError,
    sessionErrorKind,
    retryRestoreSession,
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
