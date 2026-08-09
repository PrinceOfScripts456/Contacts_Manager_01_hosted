/**
 * Very small heuristic strength meter — length + character variety.
 * Purely a UX nudge, not a validation gate (that lives in the form's
 * own validate() so it stays explicit and easy to change later).
 */
function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const score = scorePassword(password);
  const tier = score <= 1 ? 'weak' : score <= 2 ? 'fair' : 'strong';

  return (
    <div>
      <div className="pw-strength">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`pw-strength-bar${i < score ? ` filled-${tier}` : ''}`}
          />
        ))}
      </div>
      <div className="pw-strength-label">{LABELS[score]}</div>
    </div>
  );
}
