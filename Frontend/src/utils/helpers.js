// Shared pure helper functions used across components.
// These are direct ports of the helper functions from the original app.js —
// same behavior, same output, just grouped here for reuse.

export const PALETTES = [
  ['#6B8BFF', '#A78BFA'], ['#34D399', '#06B6D4'], ['#F59E0B', '#EF4444'],
  ['#EC4899', '#8B5CF6'], ['#14B8A6', '#3B82F6'], ['#F97316', '#EAB308'],
  ['#84CC16', '#10B981'], ['#E879F9', '#F43F5E'],
  ['#FB7185', '#FDA4AF'], ['#22D3EE', '#0EA5E9'], ['#A3E635', '#65A30D'],
  ['#C084FC', '#7C3AED'], ['#FBBF24', '#D97706'], ['#2DD4BF', '#0D9488'],
  ['#F472B6', '#DB2777'], ['#818CF8', '#4F46E5'], ['#4ADE80', '#16A34A'],
  ['#FCA5A5', '#DC2626'], ['#67E8F9', '#0891B2'], ['#FDBA74', '#EA580C'],
  ['#D8B4FE', '#9333EA'], ['#5EEAD4', '#0F766E'], ['#FDE047', '#CA8A04'],
  ['#F0ABFC', '#C026D3'],
];

export function palette(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export function fullName(c) {
  return [c?.firstName, c?.lastName].filter(Boolean).join(' ') || 'No name';
}

export function gradientFor(c) {
  const [a, b] = palette(fullName(c) || c?.id || 'x');
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function initials(c) {
  const f = (c?.firstName || '').trim();
  const l = (c?.lastName || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  if (l) return l.slice(0, 2).toUpperCase();
  return '?';
}

export function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

// Builds a today's-date filename like "contacts-export-11-08-2026.json"
// (dd-mm-yyyy) — used as the download name when the backend doesn't send
// a usable one via Content-Disposition, and as the placeholder/default
// shown in the export dialog when the user leaves the filename blank.
export function todayDDMMYYYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Turns whatever the user typed as an export filename into a safe,
// guaranteed-.json filename: strips characters that aren't safe in a
// downloaded filename, and makes sure it ends in ".json" exactly once
// regardless of whether the user included the extension themselves.
export function sanitizeExportFilename(name) {
  const trimmed = (name || '').trim().replace(/\.json$/i, '');
  const safe = trimmed.replace(/[\\/:*?"<>|]+/g, '').trim();
  return safe ? `${safe}.json` : '';
}

export function fmtDate(s) {
  if (!s) return '';
  try {
    const [y, m, d] = s.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[+m - 1]} ${parseInt(d, 10)}, ${y}`;
  } catch {
    return s;
  }
}

// Parses the app's own created_at / modified_at value into a real Date,
// tolerating two storage formats:
//  1. A plain numeric string, e.g. String(Date.now()) → "1752274384123".
//     `new Date("1752274384123")` does NOT parse this — new Date() only
//     accepts epoch millis as an actual number, not a numeric string, so
//     passing it straight through silently produces an Invalid Date. This
//     is detected and converted to a number first.
//  2. A normal ISO date string, e.g. "2026-07-11T15:42:00.000Z" (what a
//     Mongo/Mongoose default timestamp looks like), which `new Date()`
//     parses natively.
// Returns an Invalid Date (not null) when `s` is empty/unparseable —
// callers check `Number.isNaN(d.getTime())`.
export function parseTimestamp(s) {
  if (!s) return new Date(NaN);
  const isEpochMillisString = typeof s === 'string' && /^\d+$/.test(s);
  return new Date(isEpochMillisString ? Number(s) : s);
}

// Formats the app's own created_at / modified_at timestamp into a short,
// readable timestamp — "Jul 11, 2026, 3:42 PM".
export function fmtTimestamp(s) {
  const d = parseTimestamp(s);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${time}`;
}

// Pulls the "created" / "updated" timestamp off a contact, returning ''
// when the value is missing OR present but unparseable — deliberately
// NOT a fake placeholder date, since a made-up date is misleading (it
// looks like real data). ContactDrawer.jsx shows an explicit "No date
// recorded" label when this comes back empty; CardView.jsx/FullView.jsx
// just omit the timestamp line entirely in that case, consistent with
// how they already treat other optional fields. Reads ONLY the app's
// own custom fields (created_at / modified_at) — NOT Mongoose's
// auto-managed createdAt/updatedAt — since those are two different
// things and mixing them in would show the wrong value whenever both
// happen to exist on a document.
export function getCreatedAt(c) {
  const raw = c?.created_at || '';
  return Number.isNaN(parseTimestamp(raw).getTime()) ? '' : raw;
}

export function getUpdatedAt(c) {
  const raw = c?.modified_at || '';
  return Number.isNaN(parseTimestamp(raw).getTime()) ? '' : raw;
}

// Normalizes a contact object coming from the backend: Mongo gives `_id`,
// the app works with `id` everywhere else.
export function normalize(c) {
  return { ...c, id: c._id || c.id };
}

// Only allows http/https URLs through as real link targets. The website
// field is free-text entered by whoever's using the app, and rendering
// it directly as an <a href> without this check would let something like
// `javascript:...` execute when clicked — a classic stored-XSS pattern,
// even in a single-user app. Anything that isn't a valid http(s) URL is
// still shown as plain text (via the caller checking this return value),
// just not as a clickable link.
export function isSafeUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
