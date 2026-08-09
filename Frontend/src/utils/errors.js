/**
 * The backend no longer uses { success: false, message }. Status codes now
 * carry success/failure, and the JSON body is one of a few shapes
 * depending on the situation:
 *   { error: "..." }              - a single error string (most common)
 *   { errors: { field: "..." } }  - zod validation errors, keyed by field
 *   { message: "...", warn: "..." } - a message that may be paired with a warning
 * Any of these fields may or may not be present. This pulls out the best
 * human-readable string, falling back sensibly for network errors or
 * anything unexpected so the UI never shows "[object Object]" or a raw
 * axios error string.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const body = err?.response?.data;

  if (body?.error) return body.error;

  if (body?.errors && typeof body.errors === 'object') {
    const firstError = Object.values(body.errors)[0];
    if (firstError) return firstError;
  }

  if (body?.message) return body.message;

  if (err?.request && !err?.response) return 'Can\'t reach the server. Check your connection and try again.';

  return err?.message || fallback;
}

/**
 * Some responses may carry a non-fatal warning alongside a successful
 * result, e.g. { data: {...}, warn: "..." }. This pulls that out so
 * callers can surface it (as a toast, etc.) without treating the call
 * as a failure.
 */
export function getWarnMessage(res) {
  return res?.warn || null;
}
