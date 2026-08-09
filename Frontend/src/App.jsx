import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast/ToastProvider.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// The "*" route is a catch-all: React Router matches routes top-down and
// falls through to this if nothing else matched, so any unknown path
// (e.g. /abcxyz) renders NotFoundPage instead of a blank screen.
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
              element={(
                <ProtectedRoute>
                  <ContactsPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/account"
              element={(
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
