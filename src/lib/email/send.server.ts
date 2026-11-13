// Server-only email delivery via Resend. No SDK needed: one HTTPS call.
// RESEND_API_KEY unset => email is logged to the console and not sent (dev).
import { renderEmail, type EmailTemplateName } from "./index";

export interface DeliverResult {
  sent: boolean;
  reason?: "not_configured" | "provider_error";
  error?: string;
}

const clean = (v: string) => v.replace(/[\r\n]+/g, " ").trim(); // no header injection

export async function deliverEmail(
  to: string,
  template: EmailTemplateName,
  data: Record<string, unknown>,
): Promise<DeliverResult> {
  const rendered = renderEmail(template, data);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "HooNext <noreply@hoonext.online>";

  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set — not sending "${rendered.subject}" to ${to}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [clean(to)],
        subject: clean(rendered.subject),
        html: rendered.html,
        text: rendered.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend error", res.status, body);
      return { sent: false, reason: "provider_error", error: `Resend ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] Resend request failed", e);
    return { sent: false, reason: "provider_error", error: String(e) };
  }
}

/** Where admin notifications go: ADMIN_EMAIL, else the EMAIL_FROM mailbox. */
export function adminEmailAddress(): string | undefined {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL;
  const m = /<([^>]+)>/.exec(process.env.EMAIL_FROM || "");
  return m?.[1];
}
