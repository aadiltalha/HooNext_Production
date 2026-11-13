// Razorpay configuration checks (pure functions: safe on server + browser).
//
// Test and live are separate modes with separate keys. Key ids start with
// "rzp_test_" or "rzp_live_". The key id is the source of truth for which mode
// is in use, so the "Test mode" badge can never disagree with Razorpay.

export type RazorpayMode = "test" | "live";

export const PAYMENTS_UNAVAILABLE =
  "Payments are temporarily unavailable. Please try again shortly or contact support.";

/** Removes stray spaces, line breaks and surrounding quotes from an env value. */
export const cleanEnv = (value?: string | null): string =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/^["']|["']$/g, "");

export function keyMode(keyId?: string | null): RazorpayMode | null {
  const k = cleanEnv(keyId);
  if (k.startsWith("rzp_live_")) return "live";
  if (k.startsWith("rzp_test_")) return "test";
  return null;
}

/** Returns a plain-English problem description, or null when everything is fine. */
export function razorpayConfigProblem(opts: {
  keyId?: string | null;
  keySecret?: string | null;
}): string | null {
  if (!cleanEnv(opts.keyId)) return "RAZORPAY_KEY_ID is missing.";
  if (!keyMode(opts.keyId))
    return 'RAZORPAY_KEY_ID must start with "rzp_test_" or "rzp_live_".';
  if (!cleanEnv(opts.keySecret)) return "RAZORPAY_KEY_SECRET is missing.";
  return null;
}
