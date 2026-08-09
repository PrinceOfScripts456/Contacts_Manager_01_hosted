import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Wrap a page element with this to require login:
 *   <Route path="/" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
 *
 * While the initial session-restore check is running (only happens once,
 * on first load) it shows nothing rather than briefly flashing the login
 * page for someone who's actually already logged in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="auth-loading-page">
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
