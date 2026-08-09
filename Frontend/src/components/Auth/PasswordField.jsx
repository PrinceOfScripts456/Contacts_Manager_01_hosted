import { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from '../icons.jsx';

/**
 * Password `<input>` with a show/hide toggle, wrapped in the same
 * icon-prefixed style as the other auth inputs. Controlled component —
 * `value`/`onChange` behave like a normal input.
 */
export default function PasswordField({
  id, label, value, onChange, placeholder, error, autoComplete, inputRef,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <LockIcon size={16} />
        <input
          id={id}
          ref={inputRef}
          className={`auth-input has-toggle${error ? ' has-error' : ''}`}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="auth-toggle-visibility"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
      {error && (
        <span className="auth-field-error">{error}</span>
      )}
    </div>
  );
}
