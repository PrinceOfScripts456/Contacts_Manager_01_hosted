import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast/ToastProvider.jsx';
import PasswordField from '../components/Auth/PasswordField.jsx';
import { EmailIcon, AlertIcon, SpinnerIcon, BrandMarkIcon } from '../components/icons.jsx';
import { getErrorMessage } from '../utils/errors.js';
import './Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export default function LoginPage() {
  const { login, user, isAuthenticated, initializing, sessionError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If ProtectedRoute redirected here, send the user back where they were
  // trying to go once they've logged in.
  const redirectTo = location.state?.from?.pathname || '/';

  // Distinguishes "ProtectedRoute bounced me here because my session
  // check failed" from "I landed on /login on my own" (typed URL,
  // bookmark, refresh, clicked a link to it). ProtectedRoute is the only
  // place that navigates here WITH `state.from` attached — a direct visit
  // never has it. This is what the sessionError banner below keys off of.
  const wasRedirectedHere = !!location.state?.from;

  // /login is one of the routes that DOES call GET /users/restoreSession
  // on load (see RESTORE_SESSION_PATHS in AuthContext) — the point is to
  // find out whether the person is already validly logged in (e.g. they
  // bookmarked /login, or hit back into it). Unlike "/" and "/account",
  // /login deliberately does NOT auto-redirect on a successful restore —
  // someone who navigated here on purpose (typed the URL, clicked a
  // link) gets to see the form and decide, rather than being yanked away
  // the instant a valid session is found. Instead, a banner below offers
  // to continue into that session; see `sessionRestoredUser`.
  //
  // The one exception is `wasRedirectedHere`: if ProtectedRoute sent the
  // person here (they were mid-navigation to a protected page and got
  // bounced), a successful restore means the session was fine after all
  // — in that case skip the banner and just send them on to where they
  // were headed, same as before.
  useEffect(() => {
    if (!initializing && isAuthenticated && wasRedirectedHere) {
      navigate(redirectTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, isAuthenticated, wasRedirectedHere]);

  // Drives the "You're already logged in" banner below. Only set when a
  // restore actually succeeded on THIS page load and we're not already
  // navigating away via the wasRedirectedHere branch above. If restore
  // fails (any error, including offline) this simply stays null and the
  // form behaves as if nothing happened — no banner, no button.
  const sessionRestoredUser = !initializing && isAuthenticated && !wasRedirectedHere ? user : null;

  // sessionError explains why a session check failed — but it's only
  // worth showing when ProtectedRoute is the reason we're on /login at
  // all (see wasRedirectedHere above): that's the "you were logged in a
  // second ago, and now you're not" case, which is genuinely surprising
  // and worth explaining (session expired, invalid, server error, etc).
  //
  // A direct visit to /login — typed URL, bookmark, refresh — is
  // different: restoreSession still silently runs (see
  // RESTORE_SESSION_PATHS in AuthContext) so an already-valid session can
  // auto-redirect past the form, but if it turns out there's no valid
  // session, that's just the ordinary "you're logged out" state for
  // someone who came here to log in anyway — not an error worth
  // interrupting them with. Unlike before, typing no longer dismisses
  // this: once it IS shown, it stays up until the person submits the
  // form, at which point the normal `formError` path (success or
  // failure) replaces it.
  const showSessionError = wasRedirectedHere && !!sessionError;

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
    if (formError) setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      showToast(`Welcome back, ${user.username}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not log in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          {/* <span className="auth-brand-mark"><BrandMarkIcon size={16} /></span> */}
          {/* <span>Contacts</span> */}
        </div>

        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Log in to access your contacts.</p>
        </div>

        {sessionRestoredUser && (
          <div className="auth-session-banner" role="status">
            <span>
              You're already logged in as <strong>{sessionRestoredUser.username}</strong>.
            </span>
            <button
              type="button"
              className="btn btn-primary auth-session-banner-btn"
              onClick={() => navigate(redirectTo, { replace: true })}
            >
              Continue
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {(formError || showSessionError) && (
            <div className="auth-error-banner">
              <AlertIcon size={16} />
              <span style={{ whiteSpace: 'pre-line' }}>{formError || sessionError}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <EmailIcon size={16} />
              <input
                id="email"
                className={`auth-input${fieldErrors.email ? ' has-error' : ''}`}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                autoFocus
              />
            </div>
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          <PasswordField
            id="password"
            label="Password"
            placeholder="Your password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={fieldErrors.password}
          />

          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? <SpinnerIcon size={16} /> : null}
            <span>{submitting ? 'Logging in…' : 'Log in'}</span>
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
