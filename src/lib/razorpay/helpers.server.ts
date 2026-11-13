// Small, dependency-free helpers for the Razorpay server functions.

/** Fast non-cryptographic string hash (djb2) — used only to build cache keys. */
export function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ":" + s.length;
}

/**
 * Runs `run` once per key while a call is in flight (plus a short grace
 * period), so identical simultaneous requests share one result instead of each
 * creating its own Razorpay subscription. React dev mode fires every effect
 * twice, and users double-click; this makes both harmless.
 *
 * Deliberately NOT a long-lived cache: a completed checkout must never be
 * handed out again.
 */
export function dedupeInflight<T>(
  store: Map<string, Promise<T>>,
  key: string,
  run: () => Promise<T>,
  graceMs = 3000,
): Promise<T> {
  const existing = store.get(key);
  if (existing) return existing;
  const p = run();
  store.set(key, p);
  const release = () => setTimeout(() => store.delete(key), graceMs);
  p.then(release, () => store.delete(key)); // failures are never reused
  return p;
}
