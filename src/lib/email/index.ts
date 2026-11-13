/**
 * HooNext email service — powered by Resend.
 * RESEND_API_KEY env var enables real sending; omit for dev (console only).
 * EMAIL_FROM sets the sender address (default: noreply@hoonext.online).
 */

import { SITE_URL } from "@/lib/site-url";

export type EmailTemplateName =
  | "welcome"
  | "order_confirmation"
  | "site_progress"
  | "site_ready"
  | "site_published"
  | "support_reply"
  | "subscription_changed"
  | "contact_confirmation"
  | "admin_new_order"
  | "admin_new_message";

export interface EmailPayload {
  to: string;
  template: EmailTemplateName;
  data: Record<string, any>;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function e(v: any) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function base(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e2e8f0;margin:0;padding:0}
  .wrap{max-width:560px;margin:40px auto;background:#13131a;border:1px solid #2a2a3a;border-radius:16px;overflow:hidden}
  .header{background:linear-gradient(135deg,#06b6d4,#3b82f6 50%,#8b5cf6);padding:28px 32px}
  .header h1{margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px}
  .body{padding:28px 32px}
  .body p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#cbd5e1}
  .btn{display:inline-block;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:40px;font-weight:600;font-size:14px;margin:8px 0 16px}
  .badge{display:inline-block;background:#1e293b;border:1px solid #2a2a3a;border-radius:8px;padding:4px 12px;font-size:13px;color:#94a3b8;font-family:monospace}
  .divider{border:none;border-top:1px solid #1e293b;margin:20px 0}
  .footer{padding:16px 32px;background:#0f0f18;text-align:center;font-size:12px;color:#475569}
</style></head>
<body><div class="wrap">
  <div class="header"><h1>HooNext</h1></div>
  <div class="body">${content}</div>
  <hr class="divider">
  <div class="footer">© ${new Date().getFullYear()} HooNext · Done-for-you websites for local businesses</div>
</div></body></html>`;
}

const TEMPLATES: Record<EmailTemplateName, (d: Record<string, any>) => RenderedEmail> = {
  welcome: (d) => ({
    subject: `Welcome to HooNext, ${d.name ?? "there"}!`,
    text: `Hi ${d.name ?? ""},\n\nYour HooNext account is ready. Browse the marketplace to pick a template and get your website built.\n\n${SITE_URL}/marketplace`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p>Welcome to HooNext! Your account is ready. Browse our template marketplace to get your professional website built — done for you, no tech skills needed.</p>
      <a class="btn" href="${SITE_URL}/marketplace">Browse Templates →</a>
      <p style="color:#64748b;font-size:13px">Questions? Just reply to this email and we'll help.</p>
    `),
  }),

  order_confirmation: (d) => ({
    subject: `Order confirmed — ${d.template_name}`,
    text: `Hi ${d.name ?? ""},\n\nYour order for ${d.template_name} is confirmed (${d.plan}).\n\nWe'll start building your website as soon as we have your business details. Track progress in your dashboard:\n${SITE_URL}/dashboard`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p>Your order is confirmed and you're now in our build queue!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b">Template</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #1e293b">${e(d.template_name)}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #1e293b">${e(d.plan)}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8">Amount paid</td><td style="padding:8px 0;text-align:right;font-weight:600">${e(d.amount)}</td></tr>
      </table>
      <p>Track your website's progress and submit your business details in your dashboard:</p>
      <a class="btn" href="${SITE_URL}/dashboard">Go to Dashboard →</a>
    `),
  }),

  site_progress: (d) => ({
    subject: `Update on your website — ${e(d.status)}`,
    text: `Hi ${d.name ?? ""},\n\nYour website "${d.site_name}" status changed to: ${d.status}.\n\n${d.message ?? ""}\n\nView your progress: ${SITE_URL}/dashboard/websites/${d.site_id}`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p>There's a new update on your website <strong>${e(d.site_name)}</strong>.</p>
      <div style="background:#1e293b;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0">
        <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">New status</div>
        <div style="font-size:16px;font-weight:700;color:#60a5fa;margin-top:4px">${e(d.status)}</div>
        ${d.message ? `<div style="font-size:14px;color:#cbd5e1;margin-top:8px">${e(d.message)}</div>` : ""}
      </div>
      <a class="btn" href="${SITE_URL}/dashboard/websites/${e(d.site_id)}">View Progress →</a>
    `),
  }),

  site_ready: (d) => ({
    subject: `Your website is ready for review — ${d.site_name}`,
    text: `Hi ${d.name ?? ""},\n\n${d.site_name} is ready for your review!\n\nPreview it here: ${d.preview_url ?? `${SITE_URL}/dashboard`}\n\nYou have 2 free revision rounds — let us know what changes you'd like.`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p>Great news — <strong>${e(d.site_name)}</strong> is ready for your review!</p>
      <p>Take a look and let us know if you'd like any changes. You have <strong>2 free revision rounds</strong> included.</p>
      <a class="btn" href="${e(d.preview_url ?? `${SITE_URL}/dashboard`)}">Review Your Website →</a>
      <p style="color:#64748b;font-size:13px">Use the Update Requests section in your dashboard to request any changes.</p>
    `),
  }),

  site_published: (d) => ({
    subject: `🚀 Your website is live — ${d.site_name}`,
    text: `Hi ${d.name ?? ""},\n\n${d.site_name} is live!\n\nVisit it here: ${d.url}`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p style="font-size:22px;font-weight:700;margin-bottom:8px">🚀 Your website is live!</p>
      <p><strong>${e(d.site_name)}</strong> is now published and accessible to your customers.</p>
      <a class="btn" href="${e(d.url)}">${e(d.url)} →</a>
      <p style="color:#64748b;font-size:13px">Share it on your social media, business cards, and Google Business Profile to start getting leads.</p>
    `),
  }),

  support_reply: (d) => ({
    subject: `Re: ${d.subject}`,
    text: `Hi ${d.name ?? ""},\n\n${d.body}`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <div style="background:#1e293b;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#cbd5e1">${e(d.body)}</div>
      <p style="margin-top:16px"><a class="btn" href="${SITE_URL}${d.path ?? "/dashboard/updates"}">${e(d.cta ?? "View Request Thread →")}</a></p>
    `),
  }),

  subscription_changed: (d) => ({
    subject: `Your subscription plan has been updated`,
    text: `Hi ${d.name ?? ""},\n\nYour subscription has been changed to ${d.plan} at ${d.amount}/month.`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p>Your HooNext subscription has been updated.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b">New plan</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #1e293b">${e(d.plan)}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8">Monthly amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${e(d.amount)}/mo</td></tr>
      </table>
      <a class="btn" href="${SITE_URL}/dashboard/subscription">View Subscription →</a>
    `),
  }),

  contact_confirmation: (d) => ({
    subject: `We received your message — HooNext`,
    text: `Hi ${d.name ?? ""},\n\nThanks for reaching out! We'll reply within one business day.`,
    html: base(`
      <p>Hi <strong>${e(d.name)}</strong>,</p>
      <p>Thanks for getting in touch! We've received your message and will reply within <strong>one business day</strong>.</p>
      <p style="color:#64748b;font-size:13px">In the meantime, you can browse our template marketplace at ${SITE_URL.replace(/^https?:\/\//, "")}/marketplace.</p>
    `),
  }),

  admin_new_message: (d) => ({
    subject: `💬 New message from ${d.customer}: ${d.subject}`,
    text: `${d.customer} wrote:\n\n${d.body}\n\nReply in admin: ${SITE_URL}${d.path ?? "/admin/messages"}`,
    html: base(`
      <p><strong>${e(d.customer)}</strong> sent you a message${d.subject ? ` — <em>${e(d.subject)}</em>` : ""}.</p>
      <div style="background:#1e293b;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap">${e(d.body)}</div>
      <p style="margin-top:16px"><a class="btn" href="${SITE_URL}${d.path ?? "/admin/messages"}">Reply in Admin →</a></p>
    `),
  }),

  admin_new_order: (d) => ({
    subject: `🆕 New order: ${d.template_name} — ${d.customer_email}`,
    text: `New order received.\n\nCustomer: ${d.customer_email}\nTemplate: ${d.template_name}\nPlan: ${d.plan}\nAmount: ${d.amount}\n\nView in admin: ${SITE_URL}/admin/orders`,
    html: base(`
      <p><strong>New order received on HooNext.</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b">Customer</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #1e293b">${e(d.customer_email)}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b">Template</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #1e293b">${e(d.template_name)}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #1e293b">${e(d.plan)}</td></tr>
        <tr><td style="padding:8px 0;color:#94a3b8">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${e(d.amount)}</td></tr>
      </table>
      <a class="btn" href="${SITE_URL}/admin/orders">View in Admin →</a>
    `),
  }),
};

export function renderEmail(template: EmailTemplateName, data: Record<string, any>): RenderedEmail {
  const fn = TEMPLATES[template];
  if (!fn) throw new Error(`Unknown email template: ${template}`);
  return fn(data);
}

/**
 * Send an email from the browser via POST /api/email/send (authenticated).
 * Server code should call deliverEmail() from send.server.ts directly.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean }> {
  try {
    // Browser-only import so this module stays safe to import on the server.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { sent: false };

    // Only the template name + data go over the wire; the server renders the
    // email itself and decides who may send what to whom.
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: payload.to, template: payload.template, data: payload.data }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) console.error("[email] send rejected:", res.status, json?.error);
    return { sent: Boolean(json?.sent) };
  } catch (err) {
    console.error("[email] client send error:", err);
    return { sent: false };
  }
}
