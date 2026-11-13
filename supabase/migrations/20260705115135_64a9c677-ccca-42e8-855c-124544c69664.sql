
-- Tighten notification inserts: user posting for self OR admin posting to admin/user channels
DROP POLICY IF EXISTS "Authenticated insert notifs" ON public.notifications;
CREATE POLICY "Insert notifs self or admin" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Lock down execute on new SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.assign_client_code() FROM PUBLIC, anon, authenticated;

-- Restrict contact update to admins only (already scoped by policy; ensure no broad grants misapply)
-- Nothing else to change; keep INSERT open for the public contact form.
