import { useEffect, useMemo, useState } from 'react';
import Topbar from '../components/Topbar/Topbar.jsx';
import Toolbar from '../components/ContactGrid/Toolbar.jsx';
import ContactGrid from '../components/ContactGrid/ContactGrid.jsx';
import LoadingState from '../components/ContactGrid/LoadingState.jsx';
import Pagination from '../components/ContactGrid/Pagination.jsx';
import ContactDrawer from '../components/Drawer/ContactDrawer.jsx';
import ContactModal from '../components/ContactModal/ContactModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog.jsx';
import ExportOptionsDialog from '../components/ExportOverlay/ExportOptionsDialog.jsx';
import BlockingOverlay from '../components/BlockingOverlay/BlockingOverlay.jsx';
import { useContacts } from '../hooks/useContacts';
import { useTheme } from '../hooks/useTheme';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { fullName, parseTimestamp, getUpdatedAt } from '../utils/helpers';

// How many contacts render per on-screen page (the "1 2 3 … N" buttons
// at the bottom). This is unrelated to the backend's own page/limit
// query params, which control how big a batch of contacts the frontend
// pulls from the database in one request (see BATCH_LIMIT in
// useContacts.js) — that's a separate, larger-scale concept. This one
// purely controls how many cards/rows are mounted in the DOM at once.
const PAGE_SIZE = 50;

export default function ContactsPage() {
  const {
    contacts, pagination, loading, searching, loadingMore, exporting, importing,
    loadContacts, loadServerBatch, createContact, updateContact, removeContact, exportContacts, importContacts,
  } = useContacts();
  const { pendingDark, toggleTheme } = useTheme();

  const [view, setView] = useState('cards');
  const [sort, setSort] = useState('az');
  // Topbar debounces raw keystrokes internally and only calls
  // onQueryChange (below) once the user pauses — so this is already a
  // settled search term, sent straight to the backend as the `search`
  // query param. The backend does the actual filtering now; the frontend
  // no longer holds every contact and searches them locally.
  const [query, setQuery] = useState('');

  // Which on-screen page of the current batch is shown. Resets to page 1
  // whenever the search term or sort order changes, so results never
  // start mid-list.
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Sends the settled search term to the backend whenever it changes.
  // An empty string still triggers a real request (the backend's own
  // default page=1/limit=1000 applies), which is what resets back to the
  // unfiltered batch when the search box is cleared.
  useEffect(() => {
    loadContacts(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // The backend already returns only matching contacts (server-side
  // search), so all that's left on the client is sorting the current
  // batch — the backend's route signature doesn't include a sort param,
  // so this stays client-side, applied to whatever page of results the
  // backend most recently sent. NOTE: this sorts the full current batch
  // (up to BATCH_LIMIT contacts), not just the 50 shown on the current
  // on-screen page — pagination below only slices the already-sorted list.
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      if (sort === 'za') return fullName(b).localeCompare(fullName(a));
      if (sort === 'company') return (a.company || 'zzz').localeCompare(b.company || 'zzz');
      if (sort === 'recent') {
        // Uses only `modified_at`, the app's own custom field — not
        // Mongoose's auto-managed `updatedAt`/`createdAt`, which are a
        // separate concept and would sort by the wrong timestamp if
        // mixed in. getUpdatedAt() also handles both storage formats (a
        // numeric String(Date.now()) string or a Mongo-style ISO
        // string). A missing/unparseable value sorts as epoch 0 (oldest)
        // here — that's a sort-order decision only, it does NOT affect
        // what's displayed; the UI still shows "No date recorded" rather
        // than a fake date (see ContactDrawer.jsx).
        const aTime = parseTimestamp(getUpdatedAt(a)).getTime();
        const bTime = parseTimestamp(getUpdatedAt(b)).getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      }
      return fullName(a).localeCompare(fullName(b));
    });
  }, [contacts, sort]);

  // Only mount the current on-screen page's worth of cards/rows at a
  // time — this is what keeps scrolling smooth even with a large batch
  // loaded in memory.
  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / PAGE_SIZE));
  const visibleContacts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedContacts.slice(start, start + PAGE_SIZE);
  }, [sortedContacts, currentPage]);

  // Jump back to page 1 whenever the search term, sort order, or the
  // currently-loaded SERVER batch changes (pagination.page identifies
  // which server batch is loaded — see loadServerBatch in useContacts.js),
  // so results never start mid-list.
  useEffect(() => {
    setCurrentPage(1);
  }, [query, sort, pagination.page]);

  // If the result set shrinks (e.g. a contact gets deleted) such that the
  // current page no longer exists, fall back to the last valid page.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Whether there's a previous/next BATCH available from the backend
  // (distinct from the on-screen 1,2,3…N pager, which only ever slices
  // whatever single batch is currently loaded). Surfaced as explicit
  // "previous batch from server" / "next batch from server" buttons below
  // the on-screen pager — these replace what's loaded rather than
  // appending to it, so the app only ever holds one batch (e.g. 1000
  // contacts) in memory at a time.
  const hasPrevBatch = pagination.page > 1;
  const hasNextBatch = pagination.page < pagination.totalPages;

  function goToNextBatch() {
    loadServerBatch('next', query);
  }

  function goToPrevBatch() {
    loadServerBatch('prev', query);
  }

  const selectedContact = contacts.find((c) => c.id === selectedId) || null;

  function openDrawer(id) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedId(null);
  }

  function openAddModal() {
    setEditingContact(null);
    setModalOpen(true);
  }

  function openEditModal(id) {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    setEditingContact(c);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSaveContact(payload, avatarFile, editId) {
    try {
      let saved;
      if (editId) {
        saved = await updateContact(editId, payload, avatarFile, query);
      } else {
        saved = await createContact(payload, avatarFile, query);
      }
      setModalOpen(false);
      setSelectedId(saved.id);
      setDrawerOpen(true);
    } catch (err) {
      console.error('handleSaveContact():', err);
      // useContacts already shows a toast on failure via its own try/catch
      // for network-level errors; this catch just prevents an unhandled
      // rejection from bubbling up out of the modal's save button.
    }
  }

  function askDelete(id) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  function cancelDelete() {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    try {
      await removeContact(id);
      if (selectedId === id) closeDrawer();
    } catch (err) {
      console.error('confirmDelete():', err);
    }
  }

  const deleteTarget = contacts.find((c) => c.id === pendingDeleteId);

  function openExportDialog() {
    setExportDialogOpen(true);
  }

  function cancelExport() {
    setExportDialogOpen(false);
  }

  function confirmExport({ mode, filename }) {
    setExportDialogOpen(false);
    exportContacts({ mode, filename });
  }

  // Mirrors the original single keydown listener that closed the contact
  // modal, confirm modal, and drawer all at once on Escape.
  useEscapeKey(() => {
    setModalOpen(false);
    setConfirmOpen(false);
    closeDrawer();
  });

  const isBlocked = exporting || importing;
  const blockingMessage = exporting ? 'Preparing your export…' : 'Importing contacts…';

  return (
    <>
      <div className={`app-shell${isBlocked ? ' app-shell-blocked' : ''}`} aria-hidden={isBlocked} inert={isBlocked ? '' : undefined}>
        <Topbar
          onQueryChange={setQuery}
          view={view}
          onViewChange={setView}
          pendingDark={pendingDark}
          onToggleTheme={toggleTheme}
          onImport={(file) => importContacts(file, query)}
          onExport={openExportDialog}
          onAddContact={openAddModal}
        />

        <div className="page">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              <Toolbar
                shownCount={visibleContacts.length}
                matchCount={sortedContacts.length}
                totalOnServer={pagination.total}
                serverPage={pagination.page}
                serverTotalPages={pagination.totalPages}
                searching={searching}
                sort={sort}
                onSortChange={setSort}
              />
              <ContactGrid
                contacts={visibleContacts}
                view={view}
                query={query}
                selectedId={selectedId}
                onOpen={openDrawer}
                onEdit={openEditModal}
                onDelete={askDelete}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                loadingMore={loadingMore}
                hasPrevBatch={hasPrevBatch}
                hasNextBatch={hasNextBatch}
                onPrevBatch={goToPrevBatch}
                onNextBatch={goToNextBatch}
              />
            </>
          )}
        </div>

        <ContactDrawer
          contact={selectedContact}
          open={drawerOpen}
          onClose={closeDrawer}
          onEdit={openEditModal}
          onDelete={askDelete}
        />

        <ContactModal
          open={modalOpen}
          editingContact={editingContact}
          onClose={closeModal}
          onSave={handleSaveContact}
        />

        <ConfirmDialog
          open={confirmOpen}
          message={deleteTarget ? `"${fullName(deleteTarget)}" will be permanently removed.` : ''}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />

        <ExportOptionsDialog
          open={exportDialogOpen}
          onCancel={cancelExport}
          onConfirm={confirmExport}
        />
      </div>

      <BlockingOverlay active={isBlocked} message={blockingMessage} />
    </>
  );
}
