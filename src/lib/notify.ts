import { supabase } from "@/integrations/supabase/client";

export interface NotifyPayload {
  title: string;
  body?: string;
  url?: string;
  type?: string;
}

/** Create a notification for a specific user. */
export async function notifyUser(userId: string, n: NotifyPayload) {
  return supabase.from("notifications").insert({
    user_id: userId,
    audience: "user",
    title: n.title,
    body: n.body ?? null,
    url: n.url ?? null,
    type: n.type ?? null,
  });
}

/** Create a notification for the admin audience (user_id = null). */
export async function notifyAdmins(n: NotifyPayload) {
  return supabase.from("notifications").insert({
    user_id: null,
    audience: "admin",
    title: n.title,
    body: n.body ?? null,
    url: n.url ?? null,
    type: n.type ?? null,
  });
}

export type MessageEmailKind =
  | "support_reply"
  | "request_reply"
  | "customer_message"
  | "customer_request_message"
  | "request_created";

/**
 * Asks the server to send the email that goes with a message you just saved.
 * Fire-and-forget: the in-app notification (created by a database trigger)
 * already happened, so a failed email must never get in the user's way.
 */
export async function emailAboutMessage(kind: MessageEmailKind, id: string | null | undefined) {
  if (!id) return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/email/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, id }),
    });
  } catch (err) {
    console.error("[email] notify failed (non-fatal)", err);
  }
}
