import { createFileRoute } from "@tanstack/react-router";
import type { Admin } from "@/lib/razorpay/fulfillment.server";

// Razorpay → HooNext fulfilment webhook.
//
// Configure in Razorpay (Dashboard → Account & Settings → Webhooks → Add New
// Webhook) with the URL
//   https://<your-domain>/api/razorpay/webhook
// a secret of your choice (put the same value in RAZORPAY_WEBHOOK_SECRET), and
// tick these events: subscription.activated, subscription.charged,
// subscription.pending, subscription.halted, subscription.paused,
// subscription.resumed, subscription.cancelled, subscription.completed.
//
// Orders, sites and subscriptions are written only server-side (service role)
// after Razorpay confirms payment: here, and by confirmRazorpayPayment()
// (lib/razorpay/server.ts) when the buyer returns from checkout. Both share
// fulfillCharge(), which is idempotent. Failures return 500 so Razorpay retries.

interface SubscriptionEntity {
  id: string;
  status: string;
  current_end?: number | null;
  notes?: unknown;
}
interface PaymentEntity {
  id: string;
  amount: number;
  status: string;
}
interface WebhookBody {
  event?: string;
  payload?: {
    subscription?: { entity?: SubscriptionEntity };
    payment?: { entity?: PaymentEntity };
  };
}

export const Route = createFileRoute("/api/razorpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Signature verification needs the exact raw body — never parse first.
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";

        const { verifyWebhookSignature, normalizeNotes } = await import("@/lib/razorpay/api.server");

        if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
          console.error("[razorpay webhook] Missing RAZORPAY_WEBHOOK_SECRET");
          return new Response("Server misconfigured", { status: 500 });
        }
        if (!signature || !(await verifyWebhookSignature(rawBody, signature))) {
          console.error("[razorpay webhook] Signature verification failed");
          return new Response("Invalid signature", { status: 400 });
        }

        let body: WebhookBody;
        try {
          body = JSON.parse(rawBody) as WebhookBody;
        } catch {
          return new Response("Invalid event", { status: 400 });
        }

        const event = body.event ?? "";
        const subscription = body.payload?.subscription?.entity;
        const payment = body.payload?.payment?.entity;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          switch (event) {
            case "subscription.charged":
              if (subscription && payment && payment.status === "captured") {
                await (
                  await import("@/lib/razorpay/fulfillment.server")
                ).fulfillCharge(supabaseAdmin, {
                  paymentId: payment.id,
                  subscriptionId: subscription.id,
                  amountCents: payment.amount,
                  notes: normalizeNotes(subscription.notes),
                  periodEnd: subscription.current_end
                    ? new Date(subscription.current_end * 1000).toISOString()
                    : null,
                });
              }
              break;
            case "subscription.activated":
            case "subscription.pending":
            case "subscription.halted":
            case "subscription.paused":
            case "subscription.resumed":
            case "subscription.cancelled":
            case "subscription.completed":
              if (subscription) await syncSubscription(supabaseAdmin, subscription);
              break;
            default:
              // Acknowledge and ignore everything else.
              break;
          }
        } catch (e) {
          console.error(`[razorpay webhook] ${event} failed`, e);
          // 500 → Razorpay retries with backoff. Handlers are idempotent.
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

function mapSubscriptionStatus(status: string): "active" | "canceled" | "past_due" | "paused" {
  switch (status) {
    case "cancelled":
    case "completed":
    case "expired":
      return "canceled";
    case "pending":
    case "halted":
      return "past_due";
    case "paused":
      return "paused";
    default:
      return "active"; // created, authenticated, active
  }
}

// Keeps our subscriptions table in step with Razorpay (cancel, pause, failed renewals…).
async function syncSubscription(supabaseAdmin: Admin, subscription: SubscriptionEntity) {
  if (!subscription?.id) return;
  const periodEnd: string | null = subscription.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: mapSubscriptionStatus(subscription.status),
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
    })
    .eq("razorpay_subscription_id", subscription.id);
  // 0 rows updated is fine: subscription.* can arrive before the first charge
  // has created the row; fulfilment sets the period end itself.
  if (error) throw error;
}
