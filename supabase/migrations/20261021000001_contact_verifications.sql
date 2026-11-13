-- Verified contact details for every customer, readable by the customer and by
-- admins, writable ONLY by the server (service role).
--
-- Why a separate table instead of columns on profiles: customers are allowed to
-- update their own profile row, so any "verified" flag stored there could be
-- forged from the browser. This table has no INSERT/UPDATE policy for logged-in
-- users, and the server fills it from Supabase Auth (auth.users), which is the
-- real source of truth for email_confirmed_at / phone_confirmed_at.

CREATE TABLE IF NOT EXISTS public.contact_verifications (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  email_verified_at TIMESTAMPTZ,
  phone TEXT,
  phone_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.contact_verifications TO authenticated;
GRANT ALL ON public.contact_verifications TO service_role;

DROP POLICY IF EXISTS "Users read own contact verification" ON public.contact_verifications;
CREATE POLICY "Users read own contact verification"
  ON public.contact_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
