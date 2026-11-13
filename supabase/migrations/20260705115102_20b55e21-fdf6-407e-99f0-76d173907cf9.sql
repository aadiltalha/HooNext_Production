
-- 1. Client code on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;
CREATE SEQUENCE IF NOT EXISTS public.client_code_seq START 1000;

CREATE OR REPLACE FUNCTION public.assign_client_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_code IS NULL THEN
    NEW.client_code := 'HN-' || LPAD(nextval('public.client_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_profiles_client_code ON public.profiles;
CREATE TRIGGER tg_profiles_client_code BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_client_code();

UPDATE public.profiles SET client_code = 'HN-' || LPAD(nextval('public.client_code_seq')::text, 6, '0')
WHERE client_code IS NULL;

-- Admin can read all profiles (for customer search)
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Contact submissions
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT INSERT ON public.contact_submissions TO anon;
GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read contacts" ON public.contact_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update contacts" ON public.contact_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 3. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audience TEXT NOT NULL DEFAULT 'user' CHECK (audience IN ('user','admin')),
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_admin_idx ON public.notifications(audience, created_at DESC) WHERE audience = 'admin';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifs" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR (audience = 'admin' AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users mark own notifs" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id OR (audience = 'admin' AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Authenticated insert notifs" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
