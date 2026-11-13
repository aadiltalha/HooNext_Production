# HooNext

Done-for-you websites for local service businesses: a template marketplace, a customer dashboard,
an admin back office, Paddle payments, and live notifications.

**Stack:** TanStack Start (React 19, server-rendered) · Supabase (Postgres, Auth, Realtime) ·
Paddle (payments) · Resend (email) · Twilio via Supabase (SMS codes) · Tailwind.

## 1. Run it locally

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev               # http://localhost:3000
```

Other scripts: `npm run build` · `npm run preview` · `npm run typecheck` · `npm run lint`.

## 2. Database (Supabase)

Run every file in `supabase/migrations/` **in filename order** (Supabase SQL editor, or
`supabase db push`). The newest ones matter most for payments and messaging:

| Migration | What it does |
|---|---|
| `20260813…_paddle_migration` | Paddle columns on orders / subscriptions |
| `20261020000001_paddle_fulfilment_uniques` | One site per order, one subscription per site |
| `20261020000002_checkout_intents` | Carries the customer's onboarding answers through payment |
| `20261021000001_contact_verifications` | Verified email/phone shown on the admin Customers page |
| `20261022000001_notification_triggers_realtime` | Notifications for every message/request/contact, plus realtime |
| `20261022000002_fix_message_policies` | Lets admins reply to support messages; stops customers posting as "admin" |

### Supabase dashboard settings
- **Authentication → Providers → Email:** turn on **Confirm email** (otherwise emails are never really verified).
- **Authentication → Providers → Phone:** enable it, choose **Twilio**, and enter your Account SID, Auth Token and Message Service SID.
- **Authentication → URL Configuration:** set the Site URL to your domain and add it (and `http://localhost:3000`) to Redirect URLs.
- **Database → Replication:** nothing to do — the notifications migration adds the tables to `supabase_realtime`.

## 3. Environment variables

See `.env.example` for the full list with explanations.

- Variables starting with `VITE_` are **baked in at build time** and visible in the browser. On your host, set them *before* building.
- Everything else is **server-only** (service-role key, Paddle API key, webhook secret, Resend key). Never prefix those with `VITE_`.
- Keep `PADDLE_ENV` and `VITE_PADDLE_ENV` identical (`sandbox` or `production`).

## 4. Payments (Paddle)

1. Create the sandbox keys: API key, client-side token, and a notification destination.
2. Point the notification destination at `https://YOUR-DOMAIN/api/paddle/webhook` and subscribe to
   `transaction.completed` and all `subscription.*` events. Put its secret in `PADDLE_WEBHOOK_SECRET`.
3. Approve your domain under Checkout settings.
4. Check the tax category in `src/lib/paddle/server.ts` (`standard`) matches what your Paddle account approved.

### Going live (sandbox → real payments)

Sandbox and live are **two separate Paddle accounts**; their keys are not interchangeable. To switch, replace
*all* of these together, then restart (or redeploy, because `VITE_` values are baked in at build time):

| Variable | Sandbox | Live |
|---|---|---|
| `PADDLE_ENV` and `VITE_PADDLE_ENV` | `sandbox` | `production` |
| `PADDLE_API_KEY` | `pdl_sdbx_apikey_…` | `pdl_live_apikey_…` |
| `VITE_PADDLE_CLIENT_TOKEN` | `test_…` | `live_…` |
| `PADDLE_WEBHOOK_SECRET` | sandbox destination's secret | live destination's secret |

- The "Test mode" badge on checkout and Paddle's own "Test Mode" watermark both come from the sandbox credentials.
  The app refuses to run with a mixed set and tells you which value is wrong.
- Live checkout does **not** work from `localhost`: Paddle requires an approved domain (Checkout settings →
  default payment link / approved domains). Keep sandbox locally and test live only on your real domain.
- Create the live webhook destination (`https://YOUR-DOMAIN/api/paddle/webhook`) separately from the sandbox one.

Orders are created two ways that share the same safe-to-repeat code: right after checkout (server-verified
with Paddle), and by the webhook. Locally Paddle cannot reach your machine, so the first path does the work.

## 5. Email (Resend)

Verify your sending domain in Resend and set `EMAIL_FROM` to an address on it. Set `ADMIN_EMAIL` to the inbox
that should receive new-order and new-message alerts. Without `RESEND_API_KEY` emails are only logged.

## 6. Notifications

Every message, update request, reply and contact-form submission creates an in-app notification (database
triggers). Signed-in users get it instantly (realtime toast), optionally with a sound and a desktop alert when
the tab is in the background (bell menu), and admin replies are also emailed. Browser push when the site is
closed is not included.

## 7. SEO

Pages are server-rendered with titles, descriptions, canonical URLs, Open Graph/Twitter tags and JSON-LD
(Organization, Product, BlogPosting, FAQ, Breadcrumbs). `/sitemap.xml` and `/robots.txt` are generated from the
database and `VITE_SITE_URL`. Private pages are `noindex`. After launch, submit the sitemap in Google Search Console.

## 8. Launch checklist

- [ ] All migrations applied; **Confirm email** on; Redirect URLs set
- [ ] Twilio upgraded out of trial, countries enabled, US sender registered; **delete any Supabase "test phone numbers"**
- [ ] `PADDLE_ENV=production` / `VITE_PADDLE_ENV=production` with live keys and a live webhook destination
- [ ] Resend domain verified; `EMAIL_FROM` and `ADMIN_EMAIL` set
- [ ] `VITE_SITE_URL` is your real domain; sitemap submitted
- [ ] Rotate any keys that were ever committed (check git history for old `.env` files)
- [ ] Place one real test order end to end

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "We couldn't send the text message" | Twilio problem; run `npm run dev` and read the `[Admin: …]` note, then Twilio Console → Monitor → Logs |
| Checkout says "run the latest Supabase migration" | `checkout_intents` migration not applied |
| Admin replies fail with a row-level-security error | `fix_message_policies` migration not applied |
| No live notifications | `notification_triggers_realtime` migration not applied (pages still refresh every 30–60 s) |
| Order paid but not in the dashboard (local) | Normal if the confirm call failed; check the server log for `[paddle]` lines |
