-- Paddle migration: add tracking columns for Paddle transactions/subscriptions,
-- and close the payment-bypass gap by removing client-side INSERT on
-- orders / customer_sites / subscriptions. From here on, only the
-- service-role webhook handler (src/routes/api/paddle/webhook.ts) writes
-- these rows, after Paddle confirms the transaction was actually paid.

-- 1. Tracking columns -------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_paddle_transaction_id
  ON public.orders (paddle_transaction_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription_id
  ON public.subscriptions (paddle_subscription_id);

-- 2. Close the payment-bypass gap -------------------------------------------
-- Previously any authenticated user could INSERT a row into these tables
-- for themselves regardless of whether they'd paid (the WITH CHECK only
-- verified user_id = auth.uid()). Order/site/subscription creation now
-- happens exclusively server-side via the service-role client after a
-- verified Paddle webhook, so the client no longer needs INSERT here.

DROP POLICY IF EXISTS "Users insert own orders" ON public.orders;

-- customer_sites previously used one FOR ALL policy for the owner (which
-- granted INSERT/UPDATE/DELETE too). The client only ever reads this table
-- (edits go through site_update_requests, reviewed by admins), so replace
-- it with SELECT + admin UPDATE only.
DROP POLICY IF EXISTS "Users manage own sites" ON public.customer_sites;
CREATE POLICY "Users read own sites" ON public.customer_sites FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update sites" ON public.customer_sites FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own subs" ON public.subscriptions;

-- Note: SELECT policies on all three tables are unchanged, so users can
-- still read their own orders/sites/subscriptions from the dashboard as
-- before. The service_role key (used only by the webhook handler) bypasses
-- RLS entirely, so it can still write these rows.
