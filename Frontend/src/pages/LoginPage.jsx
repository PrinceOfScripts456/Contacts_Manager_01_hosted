import { useState } from 'react';
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
  const { login } = useAuth();
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
          <span className="auth-brand-mark"><BrandMarkIcon size={16} /></span>
          <span>Contacts</span>
        </div>

        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Log in to access your contacts.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="auth-error-banner">
              <AlertIcon size={16} />
              <span>{formError}</span>
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
