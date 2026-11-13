import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

// Onboarding answers from the customize step (includes an optional logo as a
// data URL, capped at ~800KB client-side). Cap the total so nobody can use
// this endpoint to store arbitrary large blobs.
const MAX_BUSINESS_INFO_CHARS = 1_500_000;

// Razorpay needs a fixed number of billing cycles. 120 monthly cycles = 10
// years; customers can cancel any time.
const TOTAL_BILLING_CYCLES = 120;

const schema = z.object({
  template_slug: z.string().min(1),
  purchase_option: z.enum(["buy_maintain", "subscription"]),
  business_info: z
    .record(z.string(), z.unknown())
    .refine((v) => JSON.stringify(v).length <= MAX_BUSINESS_INFO_CHARS, "Business info too large")
    .optional(),
});

function assertCents(value: unknown, label: string): number {
  const n = Number(value);
  // Razorpay needs whole, positive amounts in the lowest denomination (cents).
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Template is missing a valid ${label}`);
  }
  return n;
}

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/**
 * Razorpay plans are immutable and tied to one amount, so we keep one plan per
 * (mode, USD amount) and reuse it for every template with that price.
 */
async function getMonthlyPlanId(
  admin: Admin,
  mode: "test" | "live",
  cents: number,
): Promise<string> {
  const planKey = `${mode}_usd_monthly_${cents}`;
  const { data } = await admin
    .from("payment_plans")
    .select("plan_id")
    .eq("plan_key", planKey)
    .maybeSingle();
  if (data?.plan_id) return data.plan_id;

  const { createPlan } = await import("./api.server");
  const plan = await createPlan({
    amountCents: cents,
    name: `HooNext monthly ($${(cents / 100).toFixed(2)})`,
    description: "HooNext monthly website plan",
  });
  const { error } = await admin.from("payment_plans").insert({ plan_key: planKey, plan_id: plan.id });
  // A concurrent request may have saved its own plan for the same amount; both
  // are valid, so a unique violation is fine.
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("[razorpay] could not cache plan (non-fatal)", error);
  }
  return plan.id;
}

/**
 * Creates a Razorpay subscription for a template purchase.
 *
 * IMPORTANT: pricing is looked up from Supabase here, server-side — the
 * client never gets to say how much something costs.
 *
 *  - "subscription": the monthly subscription price, charged now and monthly.
 *  - "buy_maintain": monthly maintenance as the plan, with the one-time template
 *    price added as an upfront add-on on the first charge.
 */
const inflight = new Map<string, Promise<{ subscriptionId: string; keyId: string }>>();

export const createRazorpaySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(schema)
  .handler(async ({ data, context }) => {
    // Identical simultaneous requests (React dev double-effects, double clicks)
    // share one Razorpay subscription instead of creating two.
    const { dedupeInflight, hashString } = await import("./helpers.server");
    const key = [
      context.userId,
      data.template_slug,
      data.purchase_option,
      hashString(JSON.stringify(data.business_info ?? {})),
    ].join("|");
    return dedupeInflight(inflight, key, () => createSubscriptionFor(data, context.userId));
  });

async function createSubscriptionFor(
  data: z.infer<typeof schema>,
  userId: string,
): Promise<{ subscriptionId: string; keyId: string }> {
  const t0 = Date.now();
  const { getCredentials, createSubscription } = await import("./api.server");
  const { keyId, mode } = getCredentials();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { assertContactVerified } = await import("@/lib/verification.server");

  // Buyers must have a verified email (and phone, unless switched off) so we
  // can always reach them. Checked server-side against Supabase Auth.
  const [, templateRes] = await Promise.all([
    assertContactVerified(supabaseAdmin, userId),
    supabaseAdmin
      .from("templates")
      .select(
        "id, name, slug, one_time_price_cents, monthly_maintenance_cents, subscription_price_cents",
      )
      .eq("slug", data.template_slug)
      .maybeSingle(),
  ]);

  const template = templateRes.data;
  if (templateRes.error || !template) throw new Error("Template not found");

  const monthlyCents =
    data.purchase_option === "buy_maintain"
      ? assertCents(template.monthly_maintenance_cents, "maintenance price")
      : assertCents(template.subscription_price_cents, "subscription price");
  const upfrontCents =
    data.purchase_option === "buy_maintain"
      ? assertCents(template.one_time_price_cents, "one-time price")
      : null;

  // The onboarding answers are saved under their own key (sent to Razorpay in
  // `notes`), so saving them does NOT have to wait for Razorpay: both happen
  // at the same time. Fulfilment finds them via notes.intent_id.
  const hasAnswers = Boolean(data.business_info && Object.keys(data.business_info).length > 0);
  const intentKey = hasAnswers ? `intent_${crypto.randomUUID()}` : null;

  const planId = await getMonthlyPlanId(supabaseAdmin, mode, monthlyCents);

  const [subscription, intentResult] = await Promise.all([
    createSubscription({
      planId,
      totalCount: TOTAL_BILLING_CYCLES,
      // user_id comes from the verified auth token, never from the request body.
      notes: {
        user_id: userId,
        template_id: template.id,
        template_slug: template.slug,
        purchase_option: data.purchase_option,
        ...(intentKey ? { intent_id: intentKey } : {}),
      },
      ...(upfrontCents
        ? {
            upfront: {
              name: `${template.name} — website template (one-time)`.slice(0, 250),
              amountCents: upfrontCents,
            },
          }
        : {}),
    }),
    intentKey
      ? supabaseAdmin.from("checkout_intents").insert({
          intent_id: intentKey,
          user_id: userId,
          business_info: data.business_info as Json,
        })
      : Promise.resolve(null),
  ]);

  // Deliberately NOT swallowed: failing here beats a customer paying and
  // silently losing their answers.
  if (intentResult?.error) {
    console.error("[razorpay] could not save checkout intent", intentResult.error);
    throw new Error(
      "Could not start checkout (checkout_intents table not migrated? run the latest Supabase migration).",
    );
  }

  // Housekeeping: drop abandoned intents older than 7 days. Fire-and-forget —
  // the customer should never wait for cleanup.
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  void Promise.resolve(
    supabaseAdmin.from("checkout_intents").delete().lt("created_at", cutoff),
  ).catch(() => undefined);

  console.info(`[razorpay] createSubscription ${Date.now() - t0}ms`);
  return { subscriptionId: subscription.id, keyId };
}

const confirmSchema = z.object({
  payment_id: z.string().min(1),
  subscription_id: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Called by the checkout page right after Razorpay Checkout reports success.
 * Verifies the payment signature, then fetches the subscription and payment
 * from Razorpay's API (never trusting the browser), checks the payment is
 * captured AND belongs to the signed-in user, then runs the same idempotent
 * fulfilment as the webhook. This makes purchases complete on localhost, where
 * Razorpay cannot reach the webhook, and removes the wait on webhook latency.
 */
export const confirmRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(confirmSchema)
  .handler(async ({ data, context }) => {
    const { verifyCheckoutSignature, fetchSubscription, fetchPayment, normalizeNotes } =
      await import("./api.server");

    const valid = await verifyCheckoutSignature({
      paymentId: data.payment_id,
      subscriptionId: data.subscription_id,
      signature: data.signature,
    });
    if (!valid) throw new Error("Payment signature could not be verified");

    const [subscription, payment] = await Promise.all([
      fetchSubscription(data.subscription_id),
      fetchPayment(data.payment_id),
    ]);

    const notes = normalizeNotes(subscription.notes);
    if (notes.user_id !== context.userId) {
      throw new Error("Payment does not belong to this account");
    }

    // "captured" → money received. Anything else: not ready yet (the page retries).
    if (payment.status !== "captured") return { ready: false as const, siteId: null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fulfillCharge } = await import("./fulfillment.server");
    const siteId = await fulfillCharge(supabaseAdmin, {
      paymentId: payment.id,
      subscriptionId: subscription.id,
      amountCents: payment.amount,
      notes,
      periodEnd: subscription.current_end
        ? new Date(subscription.current_end * 1000).toISOString()
        : null,
    });
    return { ready: siteId !== null, siteId };
  });

/**
 * Called quietly while the customer is still on the customize/review steps, so
 * the server has already loaded its modules and opened its database connection
 * by the time they reach checkout. A cold first request is the slowest part of
 * the first payment.
 */
export const warmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    await Promise.all([
      import("./api.server"),
      import("@/integrations/supabase/client.server"),
      import("@/lib/verification.server"),
      import("./helpers.server"),
    ]);
    return { ok: true as const };
  });
