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
 * Same job as getErrorMessage, but for requests made with
 * `responseType: 'blob'` (e.g. file export/download). When those fail,
 * axios still resolves `err.response.data` as a Blob — even for a JSON
 * error body — because it doesn't know how to parse the response until
 * you tell it to, so `body?.error` in getErrorMessage would just be
 * undefined and fall through to a generic message. This reads the blob's
 * text, tries to parse it as the usual { error } / { errors } / { message }
 * JSON shape, and falls back gracefully if it isn't JSON at all (e.g. a
 * proxy/server error page, or a genuine network failure with no blob).
 */
export async function getBlobErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const blob = err?.response?.data;

  if (blob instanceof Blob) {
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      return getErrorMessage({ response: { data: parsed } }, fallback);
    } catch {
      // Not JSON (or empty) — fall through to the generic path below.
    }
  }

  return getErrorMessage(err, fallback);
}
