import axios from 'axios';

// Base URL comes from the environment so it's easy to point at a different
// backend (staging, production, etc.) without touching code — see .env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the httpOnly "token" cookie the backend sets on login/signup
});

/**
 * The backend doesn't wrap responses the same way on every route. Some
 * send a bare array, some send { contacts: [...] } or { data: [...] },
 * some send a single contact as { contact: {...} }. Success/failure is
 * conveyed by the HTTP status code, not a body field — a resolved axios
 * promise here always means success. This pulls a list of contacts out
 * of whatever shape shows up.
 */
function extractContactList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.contacts)) return data.contacts;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Same idea as extractContactList, but for a single contact returned from
 * create/update/avatar-upload routes, which may respond with the bare
 * contact object, { contact: {...} }, or { data: {...} }.
 */
function extractContact(data) {
  if (data?.contact && typeof data.contact === 'object') return data.contact;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
}

/**
 * GET /contacts?page=&limit=&search= — fetch one batch of contacts.
 *
 * This "page"/"limit" pair is the backend's fetch-batching mechanism
 * (how many contacts to pull from the database in one request), which is
 * a different concept from the on-screen pagination the UI shows (50
 * contacts per screen, "1 2 3 … N" buttons). To avoid confusing the two,
 * everywhere in the frontend that deals with THIS concept calls it a
 * "batch" rather than a "page".
 *
 * Returns { contacts, pagination } where pagination is whatever the
 * backend sent under `pagination` (total/page/limit/totalPages), or a
 * best-effort fallback if that key is missing so callers don't have to
 * null-check everywhere.
 */
export async function fetchContacts({ batchPage = 1, batchLimit = 1000, search = '' } = {}) {
  const res = await api.get('/contacts', {
    params: {
      page: batchPage,
      limit: batchLimit,
      ...(search ? { search } : {}),
    },
  });
  const contacts = extractContactList(res.data);
  const pagination = res.data?.pagination || {
    total: contacts.length,
    page: batchPage,
    limit: batchLimit,
    totalPages: 1,
  };
  return { contacts, pagination };
}

/**
 * POST /contacts/new — create a contact. Body is plain JSON.
 * Returns the unwrapped contact object regardless of whether the backend
 * sent it bare, wrapped in { contact: {...} }, or { data: {...} }.
 */
export async function createContact(payload) {
  const res = await api.post('/contacts/new', payload);
  return extractContact(res.data);
}

/**
 * PUT /contacts/:id — update a contact. Body is plain JSON.
 */
export async function updateContact(id, payload) {
  const res = await api.patch(`/contacts/${id}`, payload);
  return extractContact(res.data);
}

/**
 * DELETE /contacts/:id
 */
export async function deleteContact(id) {
  const res = await api.delete(`/contacts/${id}`);
  return res.data;
}

/**
 * GET /contacts/export — the backend prepares the export file
 * asynchronously and responds with JSON (not the file itself). A 2xx
 * status means success (no `success` flag in the body); the payload may
 * be bare or wrapped under `data`, and may include `exported`,
 * `downloadUrl`, `message`, and/or `warn` depending on the situation.
 * The caller uses `downloadUrl` to trigger the actual file download.
 * `downloadUrl` may be a full URL or a path relative to the API base —
 * both are resolved correctly here.
 */
export async function requestContactsExport() {
  const res = await api.get('/contacts/export');
  const body = res.data?.data && typeof res.data.data === 'object' ? res.data.data : (res.data || {});
  const { exported, downloadUrl, message } = body;
  const warn = res.data?.warn;
  const resolvedUrl = downloadUrl
    ? new URL(downloadUrl, API_URL).toString()
    : null;
  return { exported, downloadUrl: resolvedUrl, message, warn };
}

/**
 * Fetches whatever's at `url` as a blob and forces a real browser
 * download. An <a download> tag alone isn't reliable here — if the
 * server doesn't send a `Content-Disposition: attachment` header (or the
 * URL is treated as a plain navigation), Chrome just opens the file
 * inline instead of downloading it. Pulling the bytes down ourselves and
 * handing the browser a local blob: URL sidesteps that entirely, since a
 * blob: URL is always treated as a download when given a `download`
 * attribute, regardless of what headers the original response had.
 */
export async function downloadFileFromUrl(url, filename = 'export.json') {
  const res = await axios.get(url, { responseType: 'blob', withCredentials: true });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * POST /contacts/import — backend uses multer and expects a multipart
 * form upload (NOT a raw JSON body), with the file under the 'file' field.
 * Adjust the field name here if your multer middleware expects a different key.
 * Returns the raw response body as-is (not unwrapped) since the caller
 * needs the created/updated counts, not a contact list.
 */
export async function importContactsFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/contacts/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * POST /contacts/:id/avatar — uploads the avatar image file as multipart
 * form data under the 'avatar' field, so multer can store the actual file
 * and the backend can save the resulting URL on the contact document.
 */
export async function uploadAvatar(id, file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api.post(`/contacts/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return extractContact(res.data);
}

export default api;
