import { useEffect, useRef, useState } from 'react';
import {
  SearchIcon, CardsViewIcon, CompactViewIcon, FullViewIcon,
  ImportIcon, ExportIcon, SunMoonIcon, PlusIcon, BrandMarkIcon,
} from '../icons.jsx';
import UserMenu from '../Auth/UserMenu.jsx';
import './Topbar.css';

const VIEW_OPTIONS = [
  { id: 'cards', label: 'Card view', Icon: CardsViewIcon },
  { id: 'compact', label: 'Compact view', Icon: CompactViewIcon },
  { id: 'full', label: 'Detailed view', Icon: FullViewIcon },
];

const SEARCH_DEBOUNCE_MS = 250;

export default function Topbar({
  onQueryChange,
  view, onViewChange,
  pendingDark, onToggleTheme,
  onImport, onExport,
  onAddContact,
}) {
  const importInputRef = useRef(null);

  // The input's live value lives here, in Topbar, rather than in the
  // parent page. Typing only re-renders this small component — the debounced
  // value is sent up to the page (which drives filtering/rendering the
  // contact list) after a short pause, instead of on every keystroke.
  // This is what actually keeps typing smooth with a large contact list:
  // previously every keystroke re-rendered the entire page tree (grid,
  // pagination, toolbar) immediately, even though filtering itself was
  // debounced — the re-render cascade was the real cost.
  const [liveQuery, setLiveQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onQueryChange(liveQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveQuery]);

  function handleImportFileChange(e) {
    const file = e.target.files[0];
    // The browser returns focus to this input as soon as the native file
    // picker closes, which happens right as `onImport` flips the parent
    // into its blocked/aria-hidden state. Blur first so focus isn't left
    // on an element inside a container that's about to become
    // aria-hidden (avoids the "Blocked aria-hidden on an element because
    // its descendant retained focus" console warning).
    e.target.blur();
    if (file) onImport(file);
    e.target.value = '';
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-brand-mark"><BrandMarkIcon /></span>
        <span>Contacts</span>
      </div>
      <div className="topbar-sep-834"></div>

      <div className="search-wrap">
        <SearchIcon />
        <input
          className="search-input"
          type="search"
          placeholder="Search by name, phone, email…"
          autoComplete="off"
          value={liveQuery}
          onChange={(e) => setLiveQuery(e.target.value)}
        />
      </div>

      <div className="topbar-right">
        <div className="view-toggle" role="group" aria-label="View mode">
          {VIEW_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`view-btn${view === id ? ' active' : ''}`}
              title={label}
              aria-label={label}
              onClick={() => onViewChange(id)}
            >
              <Icon />
            </button>
          ))}
        </div>

        <div className="topbar-sep-580"></div>

        <button className="icon-btn" title="Import JSON" onClick={() => importInputRef.current?.click()}>
          <ImportIcon />
        </button>
        <input
          type="file"
          accept=".json"
          ref={importInputRef}
          style={{ display: 'none' }}
          onChange={handleImportFileChange}
        />
        <button className="icon-btn" title="Export JSON" onClick={onExport}>
          <ExportIcon />
        </button>
        <button className="icon-btn theme-toggle-btn" title="Toggle theme" onClick={onToggleTheme}>
          <span className="theme-icon-wrap" key={pendingDark ? 'dark' : 'light'}>
            <SunMoonIcon dark={pendingDark} />
          </span>
        </button>

        <button className="btn-add" onClick={onAddContact}>
          <PlusIcon />
          <span>New contact</span>
        </button>

        <div className="topbar-sep"></div>

        <UserMenu />
      </div>
    </header>
  );
}
