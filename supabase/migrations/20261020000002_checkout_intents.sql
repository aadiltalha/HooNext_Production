-- Carries the customer's onboarding / business info from the checkout page to
-- fulfilment. The browser keeps this data in sessionStorage; Paddle's payment
-- form never sees it, and it is too large (logo upload) for Paddle custom_data.
-- It is saved server-side when the Paddle transaction is created and copied
-- into customer_sites.business_info when the payment is fulfilled.
--
-- Server-only: RLS is on with NO policies, so only the service-role key (used
-- by createPaddleTransaction and the fulfilment code) can read or write it.

CREATE TABLE IF NOT EXISTS public.checkout_intents (
  paddle_transaction_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_intents ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.checkout_intents TO service_role;

CREATE INDEX IF NOT EXISTS idx_checkout_intents_created_at
  ON public.checkout_intents (created_at);
