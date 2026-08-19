import api from './api.js';

/**
 * ─── Auth service ───
 *
 * Talks to the real backend. Auth is cookie-based (httpOnly JWT set by the
 * server on signup/login) — there's no token to store or attach ourselves;
 * the browser sends the cookie automatically on every request as long as
 * axios is configured with `withCredentials: true` (see api.js).
 *
 * Endpoints (2xx status = success; there's no `success` field in the body).
 * Responses may carry `data`, `message`, `error`, and/or `warn`, and any of
 * those may be absent depending on the situation:
 *   POST /users/signup           { username, email, password } -> { user }
 *   POST /users/login             { email, password }           -> { user }
 *   POST /users/logout            ()                             -> (2xx, body optional)
 *   GET  /users/restoreSession     ()                             -> { user }
 *   PATCH  /users/me               { username?, email?, currentPassword?, newPassword? } -> { user }
 *
 * `user` shape: { id, username, email }
 *
 * The frontend can't read the httpOnly cookie itself, so
 * /users/restoreSession remains the single source of truth for whether a
 * session is actually valid — nothing here ever skips that call. What IS
 * kept client-side is a plain boolean *hint* (see LOGIN_HINT_KEY below): not
 * the token, not anything sensitive, just "as of the last time we checked,
 * did the user appear to be logged in?". It's used purely to decide whether
 * it's worth showing a loading screen while restoreSession runs, or whether
 * to skip straight to the logged-out UI and let restoreSession happen (or
 * not) in the background. The hint can be stale or wrong (cleared cookie,
 * expired token, cleared via devtools, etc.) — callers must still treat
 * restoreSession's actual response as the real answer.
 */

const LOGIN_HINT_KEY = 'cm-login-session';

/** True if, as of the last check, the user appeared to have a session. */
export function hasLoginHint() {
  try {
    return localStorage.getItem(LOGIN_HINT_KEY) === 'true';
  } catch {
    // localStorage can throw in private-browsing/disabled-storage cases —
    // fall back to "no hint", which just means the normal (slower) path.
    return false;
  }
}

/** Set after any successful login/signup/restore. */
function setLoginHint() {
  try {
    localStorage.setItem(LOGIN_HINT_KEY, 'true');
  } catch {
    // Ignore — worst case we just lose the fast path next load.
  }
}

/**
 * Cleared on logout, account deletion, and on a confirmed "not logged in"
 * from the server. Exported because AuthContext's deleteAccount doesn't
 * route through logout() but still needs to clear the hint.
 */
export function clearLoginHint() {
  try {
    localStorage.removeItem(LOGIN_HINT_KEY);
  } catch {
    // Ignore.
  }
}

export async function signup({ username, email, password }) {
  const res = await api.post('/users/signup', { username, email, password });
  setLoginHint();
  return res.data.user;
}

export async function login({ email, password }) {
  const res = await api.post('/users/login', { email, password });
  setLoginHint();
  return res.data.user;
}

export async function logout() {
  await api.post('/users/logout');
  clearLoginHint();
}

/**
 * GET /users/restoreSession — called on app load to silently restore a
 * session from the httpOnly cookie, with no id or prior state needed.
 * Resolves with the user on a valid session, throws (401) otherwise.
 * Keeps the login hint in sync with whatever the server actually says.
 */
export async function restoreSession() {
  try {
    const res = await api.get('/users/restoreSession');
    setLoginHint();
    return res.data.user;
  } catch (err) {
    // Only clear the hint on a definitive "not logged in" (401) — not on
    // network/server-down errors, where we genuinely don't know and
    // shouldn't throw away a hint that might still be accurate.
    if (err?.response?.status === 401) clearLoginHint();
    throw err;
  }
}

export async function updateProfile(payload) {
  const res = await api.patch('/users/me', payload);
  return res.data.user;
}

/**
 * DELETE /users/me — permanently deletes the account. The backend reads
 * the id off the authenticated session (`req.userId`) rather than trusting
 * anything in the URL, so this always deletes the caller's own account.
 */
export async function deleteAccount() {
  const res = await api.delete('/users/me');
  return res.data;
}
