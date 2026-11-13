-- Notifications created by the DATABASE, plus realtime delivery.
--
-- Until now notifications were inserted from the browser, which silently failed
-- whenever a customer needed to notify the admins (the insert policy only lets
-- a user write notifications for themselves), and many events had no
-- notification at all (support messages, update-request messages, new requests,
-- contact-form submissions).
--
-- Triggers run as the function owner, so they cannot be blocked by row-level
-- security, and no front-end code path can forget to call them. Every trigger
-- is wrapped so a notification problem can NEVER stop the message itself from
-- being saved.

CREATE OR REPLACE FUNCTION public.notification_snippet(txt text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT left(regexp_replace(coalesce(txt, ''), '\s+', ' ', 'g'), 140)
$$;

-- ── Support messages (customer <-> admin) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text;
BEGIN
  IF NEW.from_admin THEN
    INSERT INTO public.notifications (user_id, audience, title, body, url, type)
    VALUES (
      NEW.user_id, 'user', 'New message from HooNext',
      public.notification_snippet(NEW.body),
      CASE WHEN NEW.site_id IS NOT NULL THEN '/dashboard/websites/' || NEW.site_id ELSE '/dashboard/support' END,
      'message'
    );
  ELSE
    SELECT coalesce(nullif(full_name, ''), email, 'a customer') INTO who FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.notifications (user_id, audience, title, body, url, type)
    VALUES (
      NULL, 'admin', 'New message from ' || coalesce(who, 'a customer'),
      coalesce(nullif(NEW.subject, ''), 'Support') || ': ' || public.notification_snippet(NEW.body),
      '/admin/messages', 'message'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_support_message failed: %', SQLERRM;
  RETURN NEW;
END $$;

-- ── Update-request chat ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_request_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; req_title text; who text;
BEGIN
  SELECT r.user_id, r.title INTO owner, req_title FROM public.site_update_requests r WHERE r.id = NEW.request_id;
  IF owner IS NULL THEN RETURN NEW; END IF;

  IF NEW.from_admin THEN
    INSERT INTO public.notifications (user_id, audience, title, body, url, type)
    VALUES (owner, 'user', 'Reply on: ' || coalesce(req_title, 'your update request'),
            public.notification_snippet(NEW.body), '/dashboard/updates', 'update');
  ELSE
    SELECT coalesce(nullif(full_name, ''), email, 'a customer') INTO who FROM public.profiles WHERE id = owner;
    INSERT INTO public.notifications (user_id, audience, title, body, url, type)
    VALUES (NULL, 'admin', coalesce(who, 'A customer') || ' replied on: ' || coalesce(req_title, 'an update request'),
            public.notification_snippet(NEW.body), '/admin/requests', 'update');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_request_message failed: %', SQLERRM;
  RETURN NEW;
END $$;

-- ── New update request ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_update_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE who text;
BEGIN
  SELECT coalesce(nullif(full_name, ''), email, 'a customer') INTO who FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (user_id, audience, title, body, url, type)
  VALUES (NULL, 'admin', 'New update request from ' || coalesce(who, 'a customer'),
          NEW.title || ': ' || public.notification_snippet(NEW.description), '/admin/requests', 'update');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_update_request failed: %', SQLERRM;
  RETURN NEW;
END $$;

-- ── Contact form (works for visitors who are not signed in) ──────────────────
CREATE OR REPLACE FUNCTION public.notify_contact_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, audience, title, body, url, type)
  VALUES (NULL, 'admin', 'New contact from ' || coalesce(nullif(NEW.name, ''), 'a visitor'),
          coalesce(nullif(NEW.subject, ''), public.notification_snippet(NEW.message)),
          '/admin/contacts', 'contact');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_contact_submission failed: %', SQLERRM;
  RETURN NEW;
END $$;

-- Trigger functions are never called directly.
REVOKE EXECUTE ON FUNCTION public.notify_support_message()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_request_message()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_update_request()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contact_submission()   FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_support_message ON public.support_messages;
CREATE TRIGGER trg_notify_support_message AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_message();

DROP TRIGGER IF EXISTS trg_notify_request_message ON public.request_messages;
CREATE TRIGGER trg_notify_request_message AFTER INSERT ON public.request_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_request_message();

DROP TRIGGER IF EXISTS trg_notify_new_update_request ON public.site_update_requests;
CREATE TRIGGER trg_notify_new_update_request AFTER INSERT ON public.site_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_update_request();

DROP TRIGGER IF EXISTS trg_notify_contact_submission ON public.contact_submissions;
CREATE TRIGGER trg_notify_contact_submission AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_contact_submission();

-- ── Realtime: push these tables to connected browsers ────────────────────────
-- Realtime still applies row-level security, so each person only receives the
-- rows they are allowed to read.
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['notifications', 'support_messages', 'request_messages', 'site_update_requests', 'customer_sites']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
