import { useEffect, useRef, useState } from 'react';
import { CloseIcon, ExportIcon } from '../icons.jsx';
import { todayDDMMYYYY } from '../../utils/helpers.js';
import '../ContactModal/Modal.css';
import './ExportOptionsDialog.css';

/**
 * Lets the user choose how to export their contacts before the download
 * starts, mirroring the backend's `GET /contacts/export?mode=` options:
 *
 *  - "backup": keeps each contact's _id in the file. Re-importing this
 *    file later (to the same account) updates the existing contacts
 *    instead of creating duplicates. Best for personal backups.
 *  - "share":  strips _id from every contact (and sub-documents) so the
 *    file can be handed to someone else without their import colliding
 *    with this account's contact ids. Importing a "share" file more than
 *    once WILL duplicate contacts, since there's no id to match against.
 *
 * Filename is optional — leaving it blank falls back to the app's
 * default `contacts-export-dd-mm-yyyy.json` naming.
 *
 * `onConfirm({ mode, filename })` is called with the user's choice.
 */
export default function ExportOptionsDialog({ open, onCancel, onConfirm }) {
  const [mode, setMode] = useState('backup');
  const [filename, setFilename] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMode('backup');
      setFilename('');
      // Let the open transition start before focusing so it doesn't jank.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({ mode, filename: filename.trim() });
  }

  const placeholder = `contacts-export-${todayDDMMYYYY()}`;

  return (
    <div
      className={`modal-overlay${open ? ' open' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal" style={{ maxWidth: 460 }} role="dialog" aria-label="Export contacts">
        <div className="modal-header">
          <span className="modal-title">Export contacts</span>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="export-mode-options" role="radiogroup" aria-label="Export mode">
              <label className={`export-mode-option${mode === 'backup' ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="export-mode"
                  value="backup"
                  checked={mode === 'backup'}
                  onChange={() => setMode('backup')}
                />
                <div className="export-mode-text">
                  <span className="export-mode-title">Backup</span>
                  <span className="export-mode-desc">
                    Keeps each contact's ID. Re-importing this file later updates your existing
                    contacts instead of duplicating them. Best for your own backups.
                  </span>
                </div>
              </label>

              <label className={`export-mode-option${mode === 'share' ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="export-mode"
                  value="share"
                  checked={mode === 'share'}
                  onChange={() => setMode('share')}
                />
                <div className="export-mode-text">
                  <span className="export-mode-title">Share</span>
                  <span className="export-mode-desc">
                    Removes contact IDs so someone else can import this file without conflicting
                    with your own contacts. Importing it more than once will create duplicates.
                  </span>
                </div>
              </label>
            </div>

            <div className="export-filename-field">
              <label className="auth-label" htmlFor="export-filename">
                File name <span className="export-filename-optional">(optional)</span>
              </label>
              <div className="export-filename-input-wrap">
                <input
                  id="export-filename"
                  ref={inputRef}
                  className="auth-input export-filename-input"
                  type="text"
                  placeholder={placeholder}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
                <span className="export-filename-suffix">.json</span>
              </div>
              <span className="export-filename-hint">Leave blank to use the default name.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <ExportIcon />
              <span>Export</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
