import { DeleteIcon } from '../icons.jsx';
import '../ContactModal/Modal.css';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  open, title = 'Delete contact?', message, confirmLabel = 'Delete', icon, onCancel, onConfirm,
}) {
  return (
    <div
      className={`modal-overlay${open ? ' open' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal" style={{ maxWidth: 360 }} role="dialog">
        <div className="confirm-body">
          <div className="confirm-icon">
            {icon || <DeleteIcon size={24} />}
          </div>
          <h3>{title}</h3>
          <p>{message || 'This contact will be permanently removed.'}</p>
          <div className="confirm-foot">
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn btn-red" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
