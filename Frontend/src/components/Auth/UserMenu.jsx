import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../Toast/ToastProvider.jsx';
import { LogoutIcon, SettingsIcon } from '../icons.jsx';
import './UserMenu.css';

function initialsFor(username) {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Deterministic-ish gradient so the same user always gets the same color,
// matching the pattern used for contact avatars (gradientFor in helpers.js).
const GRADIENTS = [
  'linear-gradient(135deg, #5B6AF0, #8C5BF0)',
  'linear-gradient(135deg, #1DC49A, #5BF0C7)',
  'linear-gradient(135deg, #E8446A, #F0A15B)',
  'linear-gradient(135deg, #3A9BE8, #5B6AF0)',
];

function gradientForUser(user) {
  const seed = (user?.email || user?.username || '').length;
  return GRADIENTS[seed % GRADIENTS.length];
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    showToast('Logged out.');
    navigate('/login', { replace: true });
  }

  function goToAccount() {
    setOpen(false);
    navigate('/account');
  }

  if (!user) return null;

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title={user.username}
      >
        <span className="user-menu-av" style={{ background: gradientForUser(user) }}>
          {initialsFor(user.username)}
        </span>
      </button>

      <div className={`user-menu-dropdown${open ? ' open' : ''}`}>
        <div className="user-menu-info">
          <span className="user-menu-av" style={{ background: gradientForUser(user) }}>
            {initialsFor(user.username)}
          </span>
          <div className="user-menu-text">
            <span className="user-menu-name">{user.username}</span>
            <span className="user-menu-email">{user.email}</span>
          </div>
        </div>
        <div className="user-menu-sep"></div>
        <button className="user-menu-item" onClick={goToAccount}>
          <SettingsIcon size={15} />
          <span>Account settings</span>
        </button>
        <button className="user-menu-item user-menu-item-danger" onClick={handleLogout}>
          <LogoutIcon size={15} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
