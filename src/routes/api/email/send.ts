import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// POST /api/email/send   (Authorization: Bearer <supabase access token>)
// body: { template, to, data }
//
// This is NOT an open relay:
//  - the caller must be signed in;
//  - the server renders the template (the client cannot supply subject/html);
//  - normal users may only send welcome / order_confirmation to THEMSELVES;
//  - admins may send any template to a customer;
//  - admin_new_order always goes to the configured admin mailbox;
//  - per-user rate limit + payload size cap.

const TEMPLATES = [
  "welcome",
  "order_confirmation",
  "site_progress",
  "site_ready",
  "site_published",
  "support_reply",
  "subscription_changed",
  "contact_confirmation",
  "admin_new_order",
  "admin_new_message",
] as const;

const USER_TEMPLATES = new Set<string>(["welcome", "order_confirmation"]);

const bodySchema = z.object({
  template: z.enum(TEMPLATES),
  to: z.string().email().max(254),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const Route = createFileRoute("/api/email/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          authenticate,
          jsonResponse: json,
          rateLimited,
        } = await import("@/lib/email/auth.server");
        const caller = await authenticate(request);
        if (caller instanceof Response) return caller;
        const { user, isAdmin } = caller;

        if (rateLimited(user.id)) return json(429, { error: "Too many emails, slow down" });

        let parsed;
        try {
          const raw = await request.text();
          if (raw.length > 20_000) return json(413, { error: "Payload too large" });
          parsed = bodySchema.safeParse(JSON.parse(raw));
        } catch {
          return json(400, { error: "Invalid JSON" });
        }
        if (!parsed.success) return json(400, { error: "Invalid request" });
        const { template, to, data } = parsed.data;

        const { deliverEmail, adminEmailAddress } = await import("@/lib/email/send.server");

        let recipient = to;
        if (!isAdmin) {
          if (!USER_TEMPLATES.has(template)) return json(403, { error: "Not allowed" });
          if (!user.email || to.toLowerCase() !== user.email.toLowerCase()) {
            return json(403, { error: "You can only email yourself" });
          }
        } else if (template === "admin_new_order" || template === "admin_new_message") {
          const admin = adminEmailAddress();
          if (!admin) return json(500, { error: "ADMIN_EMAIL not configured" });
          recipient = admin;
        }

        const result = await deliverEmail(recipient, template, data);
        if (!result.sent && result.reason === "provider_error") {
          return json(502, { sent: false, error: "Email provider error" });
        }
        return json(200, {
          sent: result.sent,
          ...(result.reason ? { reason: result.reason } : {}),
        });
      },
    },
  },
});
