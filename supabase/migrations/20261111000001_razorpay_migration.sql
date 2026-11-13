-- Razorpay migration: replaces the old payment-provider columns with Razorpay
-- ones and adds a small cache of Razorpay subscription plans.
--
-- Safe to run once on any database that already ran the earlier migrations.
-- It only RENAMES columns (existing rows and their uniqueness are kept) and is
-- guarded so running it twice does nothing.
--
-- After this migration no column, index or table in the public schema refers to
-- the previous payment provider.

-- 1. orders -----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'orders'
               AND column_name = 'paddle_transaction_id') THEN
    ALTER TABLE public.orders RENAME COLUMN paddle_transaction_id TO razorpay_payment_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'orders'
               AND column_name = 'paddle_subscription_id') THEN
    ALTER TABLE public.orders RENAME COLUMN paddle_subscription_id TO razorpay_subscription_id;
  END IF;
END $$;

-- Fresh databases that skipped the earlier migrations still end up correct.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

ALTER INDEX IF EXISTS public.orders_paddle_transaction_id_key RENAME TO orders_razorpay_payment_id_key;
ALTER INDEX IF EXISTS public.idx_orders_paddle_transaction_id RENAME TO idx_orders_razorpay_payment_id;

-- 2. subscriptions ----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'subscriptions'
               AND column_name = 'paddle_subscription_id') THEN
    ALTER TABLE public.subscriptions RENAME COLUMN paddle_subscription_id TO razorpay_subscription_id;
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT UNIQUE;

ALTER INDEX IF EXISTS public.subscriptions_paddle_subscription_id_key RENAME TO subscriptions_razorpay_subscription_id_key;
ALTER INDEX IF EXISTS public.idx_subscriptions_paddle_subscription_id RENAME TO idx_subscriptions_razorpay_subscription_id;

-- 3. checkout_intents -------------------------------------------------------
-- The key is now our own "intent_…" id (sent to Razorpay in the subscription notes).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'checkout_intents'
               AND column_name = 'paddle_transaction_id') THEN
    ALTER TABLE public.checkout_intents RENAME COLUMN paddle_transaction_id TO intent_id;
  END IF;
END $$;

-- 4. Razorpay plan cache ----------------------------------------------------
-- Razorpay plans are immutable and tied to one amount. We create one per
-- (mode, USD amount) the first time it is needed and reuse it afterwards.
-- Server-only: RLS is on with NO policies, so only the service-role key can use it.
CREATE TABLE IF NOT EXISTS public.payment_plans (
  plan_key TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payment_plans TO service_role;
