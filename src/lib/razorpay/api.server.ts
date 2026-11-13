// Minimal Razorpay REST client + signature helpers (server only).
// Uses fetch and Web Crypto, so there is no extra npm dependency and it runs on
// any server runtime.
import { cleanEnv, keyMode, razorpayConfigProblem, type RazorpayMode } from "./config";

const API = "https://api.razorpay.com/v1";

export class RazorpayApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RazorpayApiError";
    this.status = status;
    this.code = code;
  }
}

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  mode: RazorpayMode;
}

export function getCredentials(): RazorpayCredentials {
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
  const problem = razorpayConfigProblem({ keyId, keySecret });
  if (problem) {
    console.error("[razorpay] CONFIGURATION PROBLEM:", problem);
    throw new Error(
      process.env.NODE_ENV === "production"
        ? "Payments are temporarily unavailable. Please try again shortly or contact support."
        : `Razorpay is not configured: ${problem}`,
    );
  }
  return { keyId, keySecret, mode: keyMode(keyId) as RazorpayMode };
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { keyId, keySecret } = getCredentials();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    error?: { description?: string; code?: string };
  } | null;
  if (!res.ok) {
    const err = json?.error;
    throw new RazorpayApiError(
      err?.description || `Razorpay request failed (${res.status})`,
      res.status,
      err?.code,
    );
  }
  return json as T;
}

// Razorpay returns `notes: []` (an empty array) when there are none.
export function normalizeNotes(notes: unknown): Record<string, string | undefined> {
  return notes && typeof notes === "object" && !Array.isArray(notes)
    ? (notes as Record<string, string | undefined>)
    : {};
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string; // created | authenticated | active | pending | halted | cancelled | completed | expired | paused
  current_start?: number | null;
  current_end?: number | null; // unix seconds
  charge_at?: number | null;
  paid_count?: number;
  notes?: unknown;
}

export interface RazorpayPayment {
  id: string;
  amount: number; // smallest currency unit (cents for USD)
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
  captured?: boolean;
  email?: string;
  notes?: unknown;
}

export const createPlan = (p: { amountCents: number; name: string; description: string }) =>
  call<{ id: string }>("POST", "/plans", {
    period: "monthly",
    interval: 1,
    item: { name: p.name, description: p.description, amount: p.amountCents, currency: "USD" },
  });

export const createSubscription = (p: {
  planId: string;
  totalCount: number;
  notes: Record<string, string>;
  upfront?: { name: string; amountCents: number };
}) =>
  call<RazorpaySubscription>("POST", "/subscriptions", {
    plan_id: p.planId,
    total_count: p.totalCount,
    quantity: 1,
    customer_notify: 1,
    notes: p.notes,
    ...(p.upfront
      ? {
          addons: [
            { item: { name: p.upfront.name, amount: p.upfront.amountCents, currency: "USD" } },
          ],
        }
      : {}),
  });

export const fetchSubscription = (id: string) =>
  call<RazorpaySubscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);

export const fetchPayment = (id: string) =>
  call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(id)}`);

// ─── Signatures ───────────────────────────────────────────────────────────────
async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies the signature Razorpay Checkout returns to the browser after payment. */
export async function verifyCheckoutSignature(p: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): Promise<boolean> {
  const { keySecret } = getCredentials();
  const expected = await hmacHex(keySecret, `${p.paymentId}|${p.subscriptionId}`);
  return safeEqual(expected, p.signature.trim().toLowerCase());
}

/** Verifies the X-Razorpay-Signature header of a webhook (HMAC of the raw body). */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = cleanEnv(process.env.RAZORPAY_WEBHOOK_SECRET);
  if (!secret) return false;
  const expected = await hmacHex(secret, rawBody);
  return safeEqual(expected, signature.trim().toLowerCase());
}
