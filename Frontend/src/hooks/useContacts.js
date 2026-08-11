import { useCallback, useRef, useState } from 'react';
import * as api from '../services/api';
import { normalize, fullName } from '../utils/helpers';
import { useToast } from '../components/Toast/ToastProvider';
import { getErrorMessage, getBlobErrorMessage } from '../utils/errors';

// How many contacts to request from the backend in one batch. This is
// unrelated to how many render on screen at once (see PAGE_SIZE in
// ContactsPage.jsx) — it's the backend's own `limit` query param, i.e.
// how big a slice of the database to pull into the browser at a time.
// The backend defaults to 1000 itself; passed explicitly here so the
// frontend's behavior doesn't silently change if that default ever does.
const BATCH_LIMIT = 1000;

export function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: BATCH_LIMIT, totalPages: 1 });
  const showToast = useToast();

  // Guards against two different races:
  //  1. React 18/19 StrictMode (dev only) intentionally invokes effects
  //     twice, which would otherwise fire the initial load twice and (if
  //     the backend is unreachable) show the same error toast twice.
  //  2. A user typing quickly can fire a new search before the previous
  //     one's response has arrived. Without this, a slower earlier
  //     response could land after a newer one and overwrite it with
  //     stale results.
  // Each call gets a token; only the response matching the latest token
  // is applied, and any older in-flight response is silently ignored
  // rather than shown.
  const requestToken = useRef(0);

  /**
   * Fetches one batch of contacts from the backend. `search` is passed
   * straight through as the `search` query param, so filtering happens
   * server-side — the frontend no longer holds "all" contacts and filters
   * them locally, it holds whatever the backend sends for the current
   * search term (up to BATCH_LIMIT).
   */
  const loadContacts = useCallback(async (search = '') => {
    const myToken = ++requestToken.current;
    // The very first call ever made (myToken === 1) is the initial page
    // load, which shows the full skeleton via `loading`. Every subsequent
    // call (a new search) shows the smaller inline `searching` indicator
    // instead, since contacts are already on screen at that point.
    const isInitialLoad = myToken === 1;
    if (!isInitialLoad) setSearching(true);
    try {
      const { contacts: list, pagination: pag } = await api.fetchContacts({
        batchPage: 1,
        batchLimit: BATCH_LIMIT,
        search,
      });
      if (myToken !== requestToken.current) return []; // a newer request has since started; drop this stale result
      const normalized = list.map(normalize);
      setContacts(normalized);
      setPagination(pag);

      // Only on the true initial load (not on every search-as-you-type)
      // — this is meant to explain the batching once, not nag on every
      // keystroke. Only worth mentioning at all when there's actually
      // more on the server than what's shown; otherwise "showing all of
      // them" isn't worth a toast.
      if (isInitialLoad && pag.total > normalized.length) {
        showToast(
          `Showing ${normalized.length.toLocaleString()} of ${pag.total.toLocaleString()} contacts (loaded in batches for performance).`,
          4500,
        );
      }

      return normalized;
    } catch (err) {
      if (myToken !== requestToken.current) return [];
      console.error('loadContacts():', err);
      showToast('Could not load contacts. Is the server running?');
      return [];
    } finally {
      if (myToken === requestToken.current) {
        setLoading(false);
        setSearching(false);
      }
    }
  }, [showToast]);

  /**
   * Fetches a DIFFERENT backend batch (the next or previous page/limit
   * slice) for the current search term and REPLACES what's currently
   * loaded with it — this does not merge/append. The backend's own
   * page/limit batching (BATCH_LIMIT contacts per request) is a separate
   * concept from the on-screen "1 2 3 … N" pagination (which only slices
   * whatever single batch is currently loaded): previously nothing ever
   * asked the backend for batch 2+, so once a search matched more than
   * BATCH_LIMIT contacts the rest were simply unreachable. This is that
   * missing piece — but deliberately kept as a swap rather than an
   * accumulate, so memory usage stays bounded to one batch (e.g. 1000
   * contacts) at a time instead of growing unbounded as more batches are
   * fetched.
   *
   * `direction` is 'next' or 'prev'. Silently no-ops if there is no such
   * batch (already on the first/last page) or a fetch is already in
   * flight.
   */
  const loadServerBatch = useCallback(async (direction, search = '') => {
    if (loadingMore) return;
    const targetPage = direction === 'next' ? pagination.page + 1 : pagination.page - 1;
    if (targetPage < 1 || targetPage > pagination.totalPages) return;

    const myToken = ++requestToken.current; // a new "session": stale in-flight requests for the old batch should be dropped
    setLoadingMore(true);
    try {
      const { contacts: list, pagination: pag } = await api.fetchContacts({
        batchPage: targetPage,
        batchLimit: BATCH_LIMIT,
        search,
      });
      if (myToken !== requestToken.current) return; // a newer request has since started; drop this stale batch
      const normalized = list.map(normalize);
      setContacts(normalized);
      setPagination(pag);
      showToast(
        `Showing contacts ${((pag.page - 1) * pag.limit + 1).toLocaleString()}–${Math.min(pag.page * pag.limit, pag.total).toLocaleString()} of ${pag.total.toLocaleString()}.`,
        3200,
      );
    } catch (err) {
      if (myToken !== requestToken.current) return;
      console.error('loadServerBatch():', err);
      showToast('Could not load that batch of contacts.');
    } finally {
      if (myToken === requestToken.current) setLoadingMore(false);
    }
  }, [loadingMore, pagination.page, pagination.totalPages, showToast]);

  /**
   * Creates a new contact, then (if a photo was picked) uploads it separately
   * via the multer-backed avatar route. Returns the saved contact so the
   * caller can open the drawer on it.
   *
   * Mirrors the original saveContact() "CREATE" branch, including the
   * safety net that refetches the full list if the backend's response
   * doesn't look like a real contact (no id / no name) — this is what
   * fixed the "ghost card after edit" bug from earlier in development.
   */
  const createContact = useCallback(async (payload, avatarFile, currentSearch = '') => {
    // const raw = await api.createContact(payload);

    let raw;
    try {
      raw = await api.createContact(payload);
    } catch (err) {
      console.error("createContact(): ", err);
      showToast(getErrorMessage(err, 'Could not save contact.'));
      throw err;
    }

    let saved = normalize(raw);

    let needsRefetch = !saved.id || (!saved.firstName && !saved.lastName);

    if (avatarFile && saved.id) {
      try {
        const rawAvatar = await api.uploadAvatar(saved.id, avatarFile);
        if (rawAvatar && (rawAvatar.firstName || rawAvatar._id || rawAvatar.id)) {
          saved = normalize(rawAvatar);
          needsRefetch = false;
        }
      } catch (err) {
        console.error('createContact() avatar upload:', err);
        showToast('Contact added, but the photo failed to upload.');
      }
    }

    if (needsRefetch) {
      const normalized = await loadContacts(currentSearch);
      saved = normalized.find(
        (c) => (c.firstName || '') === (payload.firstName || '') && (c.lastName || '') === (payload.lastName || '')
      ) || normalized[normalized.length - 1] || saved;
    } else {
      setContacts((prev) => [...prev, saved]);
    }

    showToast('Contact added.');
    return saved;
  }, [loadContacts, showToast]);

  /**
   * Updates an existing contact, then (if a new photo was picked) uploads
   * it separately. Mirrors the original saveContact() "UPDATE" branch,
   * including the same safety net against malformed PUT responses.
   */
  const updateContact = useCallback(async (id, payload, avatarFile, currentSearch = '') => {
    // const raw = await api.updateContact(id, payload);

    let raw;
    try {
      raw = await api.updateContact(id, payload);
    } catch (err) {
      console.error('updateContact():', err);
      showToast(getErrorMessage(err, 'Could not update contact.'));
      throw err;
    }

    let updated = normalize(raw);

    let needsRefetch = !updated.id || (!updated.firstName && !updated.lastName);

    if (avatarFile) {
      try {
        const rawAvatar = await api.uploadAvatar(id, avatarFile);
        if (rawAvatar && (rawAvatar.firstName || rawAvatar._id || rawAvatar.id)) {
          updated = normalize(rawAvatar);
          needsRefetch = false;
        }
      } catch (err) {
        console.error('updateContact() avatar upload:', err);
        showToast('Contact saved, but the photo failed to upload.');
      }
    }

    if (needsRefetch) {
      const normalized = await loadContacts(currentSearch);
      updated = normalized.find((c) => c.id === id) || updated;
    } else {
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    }

    showToast('Contact updated.');
    return updated;
  }, [loadContacts, showToast]);

  const removeContact = useCallback(async (id) => {
    const target = contacts.find((c) => c.id === id);
    await api.deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    showToast('Contact deleted.');
    return target;
  }, [contacts, showToast]);

  const exportContacts = useCallback(async ({ mode = 'backup', filename = '' } = {}) => {
    if (pagination.total === 0) {
      showToast('Nothing to export.');
      return;
    }
    setExporting(true);
    const dismissPreparing = showToast('Preparing your export…', 30000);
    try {
      // The backend streams the JSON file directly in the response body
      // (no separate "prepare, then fetch a downloadUrl" step) — this
      // fetches it as a blob and hands it straight to the browser.
      const { blob, filename: resolvedFilename, message } = await api.requestContactsExport({
        mode,
        customFilename: filename,
      });
      dismissPreparing();

      api.downloadBlob(blob, resolvedFilename);

      const count = pagination.total;
      showToast(message || `Exported ${count.toLocaleString()} contact${count !== 1 ? 's' : ''}.`, 4500);
    } catch (err) {
      dismissPreparing();
      console.error('exportContacts():', err);
      // The request used responseType: 'blob', so a JSON error body from
      // the backend (e.g. 404 "No contacts found to export") arrives as a
      // Blob, not parsed JSON — getBlobErrorMessage reads it out properly.
      showToast(await getBlobErrorMessage(err, 'Could not export contacts.'));
    } finally {
      setExporting(false);
    }
  }, [pagination.total, showToast]);

  const importContacts = useCallback(async (file, currentSearch = '') => {
    setImporting(true);
    const dismissPreparing = showToast('Importing contacts…', 30000);
    try {
      const data = await api.importContactsFile(file);
      dismissPreparing();

      // Reload with whatever search term was active, so importing while
      // the list is filtered doesn't silently reset it back to "all".
      await loadContacts(currentSearch);

      // Your backend's import route responds with `created` and `updated`
      // counts, but field naming isn't consistent across every route, so
      // this checks a few likely variants before falling back to a plain
      // success message.
      const created = data.created ?? data.added ?? data.imported ?? data.inserted;
      const updated = data.updated ?? data.modified;

      if (created != null || updated != null) {
        const parts = [];
        if (created != null) parts.push(`${created} added`);
        if (updated != null) parts.push(`${updated} updated`);
        showToast(`Imported — ${parts.join(', ')}.`, 4500);
      } else {
        showToast(data.message || 'Contacts imported.', 4500);
      }

      // Non-fatal issues (e.g. some rows skipped) may ride along on a
      // successful response under `warn` — surface it without treating
      // the import as failed.
      if (data.warn) showToast(data.warn, 4500);
    } catch (err) {
      dismissPreparing();
      console.error('importContacts():', err);
      showToast(getErrorMessage(err, 'Could not import file.'));
    } finally {
      setImporting(false);
    }
  }, [loadContacts, showToast]);

  return {
    contacts,
    loading,
    searching,
    loadingMore,
    exporting,
    importing,
    pagination,
    loadContacts,
    loadServerBatch,
    createContact,
    updateContact,
    removeContact,
    exportContacts,
    importContacts,
  };
}

// Re-exported for convenience where only the name formatter is needed.
export { fullName };
