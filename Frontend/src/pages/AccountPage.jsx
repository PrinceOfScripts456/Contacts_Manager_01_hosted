import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast/ToastProvider.jsx';
import PasswordField from '../components/Auth/PasswordField.jsx';
import PasswordStrength from '../components/Auth/PasswordStrength.jsx';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog.jsx';
import { UserIcon, EmailIcon, AlertIcon, SpinnerIcon, CheckCircleIcon, ArrowLeftIcon, DeleteIcon } from '../components/icons.jsx';
import { getErrorMessage } from '../utils/errors.js';
import './Auth.css';
import './AccountPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateProfile({ username, email }) {
  const errors = {};
  if (!username.trim()) errors.username = 'Username can\'t be empty.';
  else if (username.trim().length < 2) errors.username = 'Username must be at least 2 characters.';
  if (!email.trim()) errors.email = 'Email can\'t be empty.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

function validatePassword({ currentPassword, newPassword, confirmNewPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Enter your current password.';
  if (!newPassword) errors.newPassword = 'Enter a new password.';
  else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.';
  if (confirmNewPassword !== newPassword) errors.confirmNewPassword = 'Passwords don\'t match.';
  return errors;
}

export default function AccountPage() {
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  // ─── Profile (username/email) form ───
  const [profileForm, setProfileForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileFormError, setProfileFormError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ─── Password form ───
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwFormError, setPwFormError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // ─── Delete account ───
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  function updateProfileField(key, value) {
    setProfileForm((f) => ({ ...f, [key]: value }));
    if (profileErrors[key]) setProfileErrors((e) => ({ ...e, [key]: undefined }));
    if (profileFormError) setProfileFormError('');
  }

  function updatePwField(key, value) {
    setPwForm((f) => ({ ...f, [key]: value }));
    if (pwErrors[key]) setPwErrors((e) => ({ ...e, [key]: undefined }));
    if (pwFormError) setPwFormError('');
  }

  const profileUnchanged = user
    && profileForm.username.trim() === user.username
    && profileForm.email.trim() === user.email;

  async function handleProfileSubmit(e) {
    e.preventDefault();
    const errors = validateProfile(profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    setProfileFormError('');
    try {
      await updateProfile({
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      });
      showToast('Profile updated.');
    } catch (err) {
      setProfileFormError(getErrorMessage(err, 'Could not update your profile. Please try again.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    const errors = validatePassword(pwForm);
    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPw(true);
    setPwFormError('');
    try {
      await updateProfile({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      showToast('Password changed.');
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setPwFormError(getErrorMessage(err, 'Could not change your password. Please try again.'));
    } finally {
      setSavingPw(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setConfirmDeleteOpen(false);
      navigate('/login', { replace: true });
      showToast('Your account has been deleted.');
    } catch (err) {
      setConfirmDeleteOpen(false);
      showToast(getErrorMessage(err, 'Could not delete your account. Please try again.'));
    } finally {
      setDeletingAccount(false);
    }
  }

  if (!user) return null;

  return (
    <div className="account-page">
      <header className="account-header">
        <Link to="/" className="icon-btn" title="Back to contacts" aria-label="Back to contacts">
          <ArrowLeftIcon size={16} />
        </Link>
        <h1>Account settings</h1>
      </header>

      <div className="account-body">
        <section className="account-card">
          <div className="account-card-hd">
            <h2>Profile</h2>
            <p>Update your username and email address.</p>
          </div>

          <form className="auth-form" onSubmit={handleProfileSubmit} noValidate>
            {profileFormError && (
              <div className="auth-error-banner">
                <AlertIcon size={16} />
                <span>{profileFormError}</span>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="acct-username">Username</label>
              <div className="auth-input-wrap">
                <UserIcon size={16} />
                <input
                  id="acct-username"
                  className={`auth-input${profileErrors.username ? ' has-error' : ''}`}
                  type="text"
                  autoComplete="username"
                  value={profileForm.username}
                  onChange={(e) => updateProfileField('username', e.target.value)}
                />
              </div>
              {profileErrors.username && <span className="auth-field-error">{profileErrors.username}</span>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="acct-email">Email</label>
              <div className="auth-input-wrap">
                <EmailIcon size={16} />
                <input
                  id="acct-email"
                  className={`auth-input${profileErrors.email ? ' has-error' : ''}`}
                  type="email"
                  autoComplete="email"
                  value={profileForm.email}
                  onChange={(e) => updateProfileField('email', e.target.value)}
                />
              </div>
              {profileErrors.email && <span className="auth-field-error">{profileErrors.email}</span>}
            </div>

            <button
              className="btn btn-primary account-submit"
              type="submit"
              disabled={savingProfile || profileUnchanged}
            >
              {savingProfile ? <SpinnerIcon size={16} /> : <CheckCircleIcon size={16} />}
              <span>{savingProfile ? 'Saving…' : 'Save changes'}</span>
            </button>
          </form>
        </section>

        <section className="account-card">
          <div className="account-card-hd">
            <h2>Password</h2>
            <p>Choose a new password. You'll need your current one to confirm.</p>
          </div>

          <form className="auth-form" onSubmit={handlePasswordSubmit} noValidate>
            {pwFormError && (
              <div className="auth-error-banner">
                <AlertIcon size={16} />
                <span>{pwFormError}</span>
              </div>
            )}

            <PasswordField
              id="acct-current-password"
              label="Current password"
              placeholder="Your current password"
              autoComplete="current-password"
              value={pwForm.currentPassword}
              onChange={(e) => updatePwField('currentPassword', e.target.value)}
              error={pwErrors.currentPassword}
            />

            <div>
              <PasswordField
                id="acct-new-password"
                label="New password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={(e) => updatePwField('newPassword', e.target.value)}
                error={pwErrors.newPassword}
              />
              <PasswordStrength password={pwForm.newPassword} />
            </div>

            <PasswordField
              id="acct-confirm-new-password"
              label="Confirm new password"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              value={pwForm.confirmNewPassword}
              onChange={(e) => updatePwField('confirmNewPassword', e.target.value)}
              error={pwErrors.confirmNewPassword}
            />

            <button className="btn btn-primary account-submit" type="submit" disabled={savingPw}>
              {savingPw ? <SpinnerIcon size={16} /> : <CheckCircleIcon size={16} />}
              <span>{savingPw ? 'Updating…' : 'Change password'}</span>
            </button>
          </form>
        </section>

        <section className="account-card account-card-danger">
          <div className="account-card-hd">
            <h2>Session</h2>
            <p>Log out of Contacts on this device.</p>
          </div>
          <button className="btn btn-red account-submit" onClick={handleLogout}>
            <span>Log out</span>
          </button>
        </section>

        <section className="account-card account-card-danger-zone">
          <div className="account-card-hd">
            <h2>Delete account</h2>
            <p>Permanently delete your account. This cannot be undone.</p>
          </div>
          <button
            className="btn btn-red account-submit"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <DeleteIcon size={16} />
            <span>Delete account</span>
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete your account?"
        message="This permanently deletes your account and cannot be undone."
        confirmLabel={deletingAccount ? 'Deleting…' : 'Delete account'}
        icon={<DeleteIcon size={24} />}
        onCancel={() => { if (!deletingAccount) setConfirmDeleteOpen(false); }}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
