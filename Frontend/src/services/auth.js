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
 *   PUT  /users/me                 { username?, email?, currentPassword?, newPassword? } -> { user }
 *
 * `user` shape: { id, username, email }
 *
 * There is deliberately no client-side "am I logged in" check — the
 * frontend can't read the httpOnly cookie at all, so it can't know in
 * advance whether one exists or is valid. /users/restoreSession is the
 * single source of truth: the browser sends whatever cookie it has (or
 * none), and the backend replies with the user on success or a 401 if
 * there's no valid session. Callers should treat any non-2xx as "not
 * logged in", not just a missing-cookie case specifically.
 */

export async function signup({ username, email, password }) {
  const res = await api.post('/users/signup', { username, email, password });
  return res.data.user;
}

export async function login({ email, password }) {
  const res = await api.post('/users/login', { email, password });
  return res.data.user;
}

export async function logout() {
  await api.post('/users/logout');
}

/**
 * GET /users/restoreSession — called on app load to silently restore a
 * session from the httpOnly cookie, with no id or prior state needed.
 * Resolves with the user on a valid session, throws (401) otherwise.
 */
export async function restoreSession() {
  const res = await api.get('/users/restoreSession');
  return res.data.user;
}

export async function updateProfile(payload) {
  const res = await api.put('/users/me', payload);
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
