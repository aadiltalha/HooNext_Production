// Shared, idempotent fulfilment for a paid Razorpay charge.
// Used by BOTH the webhook (source of truth in production) and the
// checkout-page confirmation call (so purchases also complete on localhost,
// where Razorpay cannot reach your webhook). Safe to run any number of times,
// concurrently, for the same payment.

import type { Json } from "@/integrations/supabase/types";

export type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** What we need to know about one successful charge of a Razorpay subscription. */
export interface PaidCharge {
  /** Razorpay payment id (pay_…) — the idempotency key for the order. */
  paymentId: string;
  /** Razorpay subscription id (sub_…). */
  subscriptionId: string;
  /** Amount actually charged, in cents (USD). */
  amountCents: number;
  /** The notes we attached when creating the subscription. */
  notes: Record<string, string | undefined>;
  /** End of the billing period this charge pays for (ISO), if known. */
  periodEnd: string | null;
}

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "23505";

/** Returns the customer site id for this purchase (null for renewals / foreign payments). */
export async function fulfillCharge(supabaseAdmin: Admin, charge: PaidCharge): Promise<string | null> {
  const { paymentId, subscriptionId, periodEnd } = charge;

  const userId: string | undefined = charge.notes.user_id;
  const templateId: string | undefined = charge.notes.template_id;
  const purchaseOption = charge.notes.purchase_option as "buy_maintain" | "subscription" | undefined;

  if (!userId || !templateId || !purchaseOption) {
    // Not one of ours (e.g. created manually in the Razorpay dashboard). Ack it.
    console.error("[razorpay] payment without our notes, ignoring", paymentId);
    return null;
  }

  // ── Renewals: a charge we have not seen, for a subscription we already know,
  // just rolls the billing period forward (never a new order or site).
  const { data: seenOrder } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("razorpay_payment_id", paymentId)
    .maybeSingle();
  if (!seenOrder) {
    const { data: knownSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();
    if (knownSub) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "active", ...(periodEnd ? { current_period_end: periodEnd } : {}) })
        .eq("id", knownSub.id);
      return null;
    }
  }

  const { data: template } = await supabaseAdmin
    .from("templates")
    .select("name, monthly_maintenance_cents, subscription_price_cents")
    .eq("id", templateId)
    .maybeSingle();

  const amountCents = charge.amountCents;

  // Each step is get-or-create so a retry after a partial failure completes
  // the remaining steps instead of stopping (or duplicating) work.

  // 1. Order (unique on razorpay_payment_id)
  let orderId: string;
  {
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();
    if (existing) {
      orderId = existing.id;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          template_id: templateId,
          purchase_option: purchaseOption,
          amount_cents: amountCents,
          status: "paid",
          razorpay_payment_id: paymentId,
          razorpay_subscription_id: subscriptionId,
        })
        .select("id")
        .single();
      if (error || !created) {
        if (isUniqueViolation(error)) {
          // A concurrent delivery inserted it first.
          const { data: again } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("razorpay_payment_id", paymentId)
            .maybeSingle();
          if (!again) throw error;
          orderId = again.id;
        } else {
          throw error ?? new Error("order insert returned no row");
        }
      } else {
        orderId = created.id;
      }
    }
  }

  // 2. Customer site (carrying the onboarding answers from the customize step)
  let businessInfo: Json = {};
  // Snapshot of how to reach the buyer, verified by Supabase Auth, so the
  // admin never has to guess which email/phone is real.
  let verifiedContact: Json | null = null;
  try {
    const { saveContactVerification } = await import("@/lib/verification.server");
    verifiedContact = (await saveContactVerification(supabaseAdmin, userId)) as unknown as Json;
  } catch (e) {
    console.error("[razorpay] could not read verified contact (non-fatal)", e);
  }
  // The customer's answers are saved under notes.intent_id when checkout starts.
  const intentKeys = [charge.notes.intent_id].filter(
    (k): k is string => typeof k === "string" && k.length > 0,
  );
  for (const key of intentKeys) {
    const { data: intent, error: intentErr } = await supabaseAdmin
      .from("checkout_intents")
      .select("business_info, user_id")
      .eq("intent_id", key)
      .maybeSingle();
    if (intentErr) {
      console.error(
        "[razorpay] could not read checkout intent (is the migration applied?)",
        intentErr,
      );
      break;
    }
    if (intent && intent.user_id === userId) {
      businessInfo = intent.business_info;
      break;
    }
  }
  const siteName = template?.name ?? "New website";
  let siteId: string;
  let siteCreated = false;
  {
    const { data: existing } = await supabaseAdmin
      .from("customer_sites")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) {
      siteId = existing.id;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("customer_sites")
        .insert({
          user_id: userId,
          template_id: templateId,
          order_id: orderId,
          purchase_option: purchaseOption,
          site_name: siteName,
          business_info: businessInfo,
          status: "pending_info",
          domain: null,
        })
        .select("id")
        .single();
      if (error || !created) {
        if (isUniqueViolation(error)) {
          // Webhook and checkout-page confirmation raced; the other one won.
          const { data: again } = await supabaseAdmin
            .from("customer_sites")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();
          if (!again) throw error;
          siteId = again.id;
        } else {
          throw error ?? new Error("customer_sites insert returned no row");
        }
      } else {
        siteId = created.id;
        siteCreated = true;
      }
    }
  }

  // Merge the verified-contact snapshot into business_info (never overwrites answers).
  if (siteCreated && verifiedContact) {
    const merged = { ...(businessInfo as Record<string, Json>), verified_contact: verifiedContact };
    await supabaseAdmin
      .from("customer_sites")
      .update({ business_info: merged as Json })
      .eq("id", siteId);
  }

  // 3. Subscription row
  {
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("site_id", siteId)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        site_id: siteId,
        purchase_option: purchaseOption,
        monthly_amount_cents:
          purchaseOption === "subscription"
            ? (template?.subscription_price_cents ?? 0)
            : (template?.monthly_maintenance_cents ?? 0),
        status: "active",
        current_period_end: periodEnd,
        razorpay_subscription_id: subscriptionId,
      });
      if (error && !isUniqueViolation(error)) throw error;
    }
  }

  // 4. Notifications — only the first time, so retries don't spam.
  if (siteCreated) {
    // The answers now live on the site; drop the staging copy (holds the logo).
    await Promise.all(
      intentKeys.map(
        (key) =>
          supabaseAdmin
            .from("checkout_intents")
            .delete()
            .eq("intent_id", key)
            .eq("user_id", userId), // never touch a row that is not this buyer's,
      ),
    );

    // Server-to-server call with no user session, so insert with the
    // service-role client (the anon-key notify() helpers rely on auth.uid()).
    const { error } = await supabaseAdmin.from("notifications").insert([
      {
        user_id: userId,
        audience: "user",
        title: `Purchase confirmed — ${siteName}`,
        body: "Add your business info to start your website setup.",
        url: `/dashboard/websites/${siteId}`,
        type: "order",
      },
      {
        user_id: null,
        audience: "admin",
        title: `New order: ${siteName}`,
        body: purchaseOption === "buy_maintain" ? "Buy & Maintain" : "Subscription",
        url: "/admin/orders",
        type: "order",
      },
    ]);
    if (error) console.error("[razorpay] notification insert failed (non-fatal)", error);

    // Emails (non-fatal; the order is already safely recorded).
    try {
      const { deliverEmail, adminEmailAddress } = await import("@/lib/email/send.server");
      const contact = verifiedContact as { email?: string | null } | null;
      const customerEmail = contact?.email ?? null;
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      const planLabel = purchaseOption === "buy_maintain" ? "Buy & Maintain" : "Subscription";
      const amount = `$${(amountCents / 100).toFixed(2)}`;
      if (customerEmail) {
        await deliverEmail(customerEmail, "order_confirmation", {
          name: prof?.full_name || "there",
          template_name: siteName,
          plan: planLabel,
          amount,
        });
      }
      const admin = adminEmailAddress();
      if (admin) {
        await deliverEmail(admin, "admin_new_order", {
          customer_email: customerEmail ?? userId,
          template_name: siteName,
          plan: planLabel,
          amount,
        });
      }
    } catch (e) {
      console.error("[razorpay] order emails failed (non-fatal)", e);
    }
  }

  return siteId;
}
