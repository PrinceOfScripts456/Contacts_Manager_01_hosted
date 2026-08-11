import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast/ToastProvider.jsx';
import PasswordField from '../components/Auth/PasswordField.jsx';
import PasswordStrength from '../components/Auth/PasswordStrength.jsx';
import { UserIcon, EmailIcon, AlertIcon, SpinnerIcon, BrandMarkIcon } from '../components/icons.jsx';
import { getErrorMessage } from '../utils/errors.js';
import './Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ username, email, password, confirmPassword }) {
  const errors = {};
  if (!username.trim()) errors.username = 'Enter a username.';
  else if (username.trim().length < 2) errors.username = 'Username must be at least 2 characters.';
  if (!email.trim()) errors.email = 'Enter your email.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Create a password.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords don\'t match.';
  return errors;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      const user = await signup({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      showToast(`Welcome, ${user.username}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create your account. Please try again.'));
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
          <h1>Create your account</h1>
          <p>Sign up to start managing your contacts.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="auth-error-banner">
              <AlertIcon size={16} />
              <span style={{ whiteSpace: 'pre-line' }}>{formError}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="username">Username</label>
            <div className="auth-input-wrap">
              <UserIcon size={16} />
              <input
                id="username"
                className={`auth-input${fieldErrors.username ? ' has-error' : ''}`}
                type="text"
                placeholder="janedoe"
                autoComplete="username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                autoFocus
              />
            </div>
            {fieldErrors.username && <span className="auth-field-error">{fieldErrors.username}</span>}
          </div>

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
              />
            </div>
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          <div>
            <PasswordField
              id="password"
              label="Password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={fieldErrors.password}
            />
            <PasswordStrength password={form.password} />
          </div>

          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            error={fieldErrors.confirmPassword}
          />

          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? <SpinnerIcon size={16} /> : null}
            <span>{submitting ? 'Creating account…' : 'Create account'}</span>
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
