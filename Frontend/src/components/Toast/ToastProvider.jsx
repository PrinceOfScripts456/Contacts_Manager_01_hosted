import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

// Messages longer than this read awkwardly as a single-line pill on
// mobile, so they get wrapped as a rounded box instead of forcing a pill
// shape to break awkwardly. This is purely a layout decision — it's
// separate from how long the toast stays visible (see DEFAULT_DURATION
// and the optional `duration` argument to showToast).
const LONG_MESSAGE_THRESHOLD = 46;
const DEFAULT_DURATION = 2700;
const WRAP_TEXT_DURATION = 4500;

// Never show more than this many toasts stacked at once. Errors (e.g. a
// flaky connection retried by several in-flight requests) can otherwise
// queue up an unbounded pile that never has time to clear. The oldest
// toast is dropped immediately (not faded out) to make room, same as it
// would've disappeared on its own shortly anyway.
const MAX_VISIBLE_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  // `duration` is optional — pass it explicitly for toasts carrying
  // information worth reading longer (e.g. import/export counts), even
  // if the message itself is short. Falls back to a length-based default
  // otherwise, so a random long message doesn't vanish before it wraps.
  //
  // A message containing "\n" (e.g. a rate-limit error with a "X left"
  // line, or getErrorMessage() surfacing a multi-line backend message)
  // is always shown as a wrapped box with the line breaks preserved,
  // regardless of its length — see the `.toast-multiline` styling below.
  //
  // Returns a function that dismisses this specific toast early — handy
  // for a "Preparing…" toast that should disappear as soon as the real
  // result is ready, rather than sitting on screen for its full duration.
  const showToast = useCallback((message, duration) => {
    const id = ++idCounter;
    const isMultiline = message.includes('\n');
    const isLong = isMultiline || message.length > LONG_MESSAGE_THRESHOLD;
    const finalDuration = duration ?? (isLong ? WRAP_TEXT_DURATION : DEFAULT_DURATION);
    setToasts((prev) => {
      // Cap the stack: if adding this one would exceed the limit, drop
      // the oldest (front of the array) to make room, clearing its timer
      // too so it doesn't fire later against an already-removed toast.
      let next = prev;
      if (next.length >= MAX_VISIBLE_TOASTS) {
        const [oldest, ...rest] = next;
        if (timers.current[oldest.id]) {
          clearTimeout(timers.current[oldest.id]);
          delete timers.current[oldest.id];
        }
        next = rest;
      }
      return [...next, { id, message, isLong, isMultiline, duration: finalDuration }];
    });
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, finalDuration);
    return () => dismissToast(id);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div
            className={`toast${t.isLong ? ' toast-wrap-text' : ''}${t.isMultiline ? ' toast-multiline' : ''}`}
            key={t.id}
            style={{ '--toast-delay': `${(t.duration - 500) / 1000}s` }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
