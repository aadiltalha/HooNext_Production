import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// POST /api/email/notify   (Authorization: Bearer <supabase access token>)
// body: { kind, id }
//
// Sends the email that goes with a message. The CLIENT only says which record
// it just created; the server loads that record itself and composes the email,
// so nobody can use this to send arbitrary text from your domain.
//
//  support_reply / request_reply            admin -> customer   (admins only)
//  customer_message / customer_request_message / request_created
//                                           customer -> admin   (must be the author,
//                                                                 and the record must be new)

const bodySchema = z.object({
  kind: z.enum([
    "support_reply",
    "request_reply",
    "customer_message",
    "customer_request_message",
    "request_created",
  ]),
  id: z.string().uuid(),
});

const ADMIN_KINDS = new Set(["support_reply", "request_reply"]);
const MAX_AGE_MS = 10 * 60_000; // a customer can only trigger mail for a fresh record
const done = new Map<string, number>(); // kind:id -> time, so retries never double-send

const clip = (t: string | null | undefined, n = 600) => (t ?? "").trim().slice(0, n);

export const Route = createFileRoute("/api/email/notify")({
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
        if (rateLimited(`notify:${user.id}`, 30)) return json(429, { error: "Too many requests" });

        let parsed;
        try {
          parsed = bodySchema.safeParse(await request.json());
        } catch {
          return json(400, { error: "Invalid JSON" });
        }
        if (!parsed.success) return json(400, { error: "Invalid request" });
        const { kind, id } = parsed.data;

        if (ADMIN_KINDS.has(kind) && !isAdmin) return json(403, { error: "Not allowed" });

        const dedupeKey = `${kind}:${id}`;
        const prev = done.get(dedupeKey);
        if (prev && Date.now() - prev < 60 * 60_000)
          return json(200, { sent: false, reason: "duplicate" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { deliverEmail, adminEmailAddress } = await import("@/lib/email/send.server");

        // Load the record + who it belongs to.
        let ownerId: string | null = null;
        let authorId: string | null = null;
        let createdAt: string | null = null;
        let subject = "";
        let body = "";
        let fromAdmin = false;

        if (kind === "support_reply" || kind === "customer_message") {
          const { data } = await supabaseAdmin
            .from("support_messages")
            .select("user_id, subject, body, from_admin, created_at")
            .eq("id", id)
            .maybeSingle();
          if (!data) return json(404, { error: "Not found" });
          ownerId = data.user_id;
          authorId = data.from_admin ? null : data.user_id;
          createdAt = data.created_at;
          subject = data.subject ?? "Support";
          body = clip(data.body);
          fromAdmin = data.from_admin;
        } else if (kind === "request_reply" || kind === "customer_request_message") {
          const { data } = await supabaseAdmin
            .from("request_messages")
            .select("user_id, body, from_admin, created_at, request_id")
            .eq("id", id)
            .maybeSingle();
          if (!data) return json(404, { error: "Not found" });
          const { data: req } = await supabaseAdmin
            .from("site_update_requests")
            .select("user_id, title")
            .eq("id", data.request_id)
            .maybeSingle();
          if (!req) return json(404, { error: "Not found" });
          ownerId = req.user_id;
          authorId = data.from_admin ? null : data.user_id;
          createdAt = data.created_at;
          subject = req.title;
          body = clip(data.body);
          fromAdmin = data.from_admin;
        } else {
          const { data } = await supabaseAdmin
            .from("site_update_requests")
            .select("user_id, title, description, created_at")
            .eq("id", id)
            .maybeSingle();
          if (!data) return json(404, { error: "Not found" });
          ownerId = data.user_id;
          authorId = data.user_id;
          createdAt = data.created_at;
          subject = data.title;
          body = clip(data.description);
        }

        // The record must really be the kind of message this route is for.
        const wantsAdminAuthor = ADMIN_KINDS.has(kind);
        if (wantsAdminAuthor !== fromAdmin && kind !== "request_created") {
          return json(400, { error: "Wrong message type" });
        }

        if (!ADMIN_KINDS.has(kind)) {
          // Customer -> admin: only the author, only for a fresh record.
          if (authorId !== user.id && !isAdmin) return json(403, { error: "Not allowed" });
          if (!createdAt || Date.now() - new Date(createdAt).getTime() > MAX_AGE_MS) {
            return json(410, { error: "Too old" });
          }
        }

        // Who is the customer?
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ownerId as string);
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", ownerId as string)
          .maybeSingle();
        const customerEmail = authUser?.user?.email ?? null;
        const customerName = prof?.full_name || customerEmail || "A customer";

        let result;
        if (ADMIN_KINDS.has(kind)) {
          if (!customerEmail) return json(200, { sent: false, reason: "no_email" });
          result = await deliverEmail(customerEmail, "support_reply", {
            name: prof?.full_name || "there",
            subject,
            body,
            path: kind === "support_reply" ? "/dashboard/support" : "/dashboard/updates",
            cta: kind === "support_reply" ? "View conversation →" : "View Request Thread →",
          });
        } else {
          const admin = adminEmailAddress();
          if (!admin) return json(200, { sent: false, reason: "no_admin_email" });
          result = await deliverEmail(admin, "admin_new_message", {
            customer: customerName,
            subject: kind === "request_created" ? `New update request: ${subject}` : subject,
            body,
            path: kind === "customer_message" ? "/admin/messages" : "/admin/requests",
          });
        }

        if (result.sent) done.set(dedupeKey, Date.now());
        if (!result.sent && result.reason === "provider_error")
          return json(502, { sent: false, error: "Email provider error" });
        return json(200, {
          sent: result.sent,
          ...(result.reason ? { reason: result.reason } : {}),
        });
      },
    },
  },
});
