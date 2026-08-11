import { useLocation } from 'react-router-dom';
import { useAuth, isSessionGatedPath } from '../../context/AuthContext.jsx';
import { BrandMarkIcon, AlertIcon } from '../icons.jsx';
import './SessionGate.css';

// Paths where "can't reach the server at all" is a hard blocker worth a
// dedicated full-screen error (there's genuinely nothing useful to show
// — no contacts to load, no account to render). /login is deliberately
// EXCLUDED: a direct visit there should just show the ordinary login
// form even if the background restore check failed for any reason
// (offline included) — see LoginPage's wasRedirectedHere for the one
// case where an error IS surfaced there (ProtectedRoute bounced them).
const OFFLINE_SCREEN_PATHS = new Set(['/', '/account']);

/**
 * Wraps the whole route tree. While a session-restore check is in
 * flight FOR THE CURRENT ROUTE (see isSessionGatedPath /
 * RESTORE_SESSION_PATHS in AuthContext — only "/", "/login", and
 * "/account" ever trigger one), this shows a full-screen loading
 * animation instead of letting that route render.
 *
 * Why this matters: without it, someone landing on /login directly (or
 * bounced there by ProtectedRoute) would see a blank/plain login form for
 * a moment, then have a sessionError banner ("Your session has expired…",
 * etc.) pop in on top of it once the restore call actually resolves.
 * Gating here means the loading screen is shown FIRST, and the login
 * page (with any session error already known) only ever appears once
 * that first check has actually finished.
 *
 * Routes that never gate on auth (e.g. /signup, an unknown "*" 404 path)
 * render immediately and are never blocked here, regardless of whatever
 * state a check on a different route left behind.
 *
 * The "backend unreachable" case is handled specially, and only for "/"
 * and "/account" (see OFFLINE_SCREEN_PATHS above) — it's kept right here
 * instead of falling through to the page, because a protected page (or a
 * login form reached via a real redirect) implies "you're logged out"
 * when the real problem is that the server can't be reached at all.
 * Every other outcome (expired session, invalid session, some other
 * server error, a successful restore, or landing directly on /login)
 * falls through to `children` as normal, where ProtectedRoute/LoginPage
 * handle it.
 */
export default function SessionGate({ children }) {
  const { initializing, sessionErrorKind, sessionError, retryRestoreSession } = useAuth();
  const location = useLocation();
  const gated = isSessionGatedPath(location.pathname);

  if (gated && initializing) {
    return (
      <div className="session-gate">
        <div className="session-gate-mark">
          <BrandMarkIcon size={22} />
        </div>
        <div className="session-gate-spinner" aria-hidden="true"></div>
        <div className="session-gate-text" role="status" aria-live="polite">
          Restoring your session…
        </div>
      </div>
    );
  }

  if (OFFLINE_SCREEN_PATHS.has(location.pathname) && sessionErrorKind === 'offline') {
    return <OfflineScreen message={sessionError} onRetry={retryRestoreSession} />;
  }

  return children;
}

function OfflineScreen({ message, onRetry }) {
  return (
    <div className="session-gate session-gate-error">
      <div className="session-gate-mark session-gate-mark-error">
        <AlertIcon size={22} />
      </div>
      <div className="session-gate-error-text" role="alert" aria-live="assertive">
        {message || "Can't reach the server. Please check your connection or try again later."}
      </div>
      <RetryButton onRetry={onRetry} />
    </div>
  );
}

function RetryButton({ onRetry }) {
  return (
    <button className="btn btn-primary session-gate-retry" onClick={onRetry}>
      <span>Try again</span>
    </button>
  );
}
