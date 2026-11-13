-- Fixes two problems in the messaging row-level-security policies.
--
-- 1) ADMIN REPLIES WERE BEING REJECTED. When an admin answers a customer, the
--    new support_messages row carries the CUSTOMER's user_id (so it shows up in
--    their thread). The only INSERT policy was `auth.uid() = user_id`, which an
--    admin never satisfies, so every admin reply failed with
--    "new row violates row-level security policy".
--
-- 2) CUSTOMERS COULD IMPERSONATE THE TEAM. Nothing stopped a customer from
--    inserting a message with from_admin = true. Only admins may now do that.

-- support_messages
DROP POLICY IF EXISTS "Admins create messages" ON public.support_messages;
CREATE POLICY "Admins create messages" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users create own messages" ON public.support_messages;
CREATE POLICY "Users create own messages" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND from_admin = false);

-- request_messages (admins already could reply; just stop impersonation)
DROP POLICY IF EXISTS "Users insert messages on own requests" ON public.request_messages;
CREATE POLICY "Users insert messages on own requests" ON public.request_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.site_update_requests r
      WHERE r.id = request_messages.request_id
        AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND (from_admin = false OR public.has_role(auth.uid(), 'admin'))
  );
