-- Chat messages for update requests
CREATE TABLE public.request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.site_update_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  from_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX request_messages_request_idx ON public.request_messages(request_id, created_at);

GRANT SELECT, INSERT ON public.request_messages TO authenticated;
GRANT ALL ON public.request_messages TO service_role;

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read messages on own requests"
  ON public.request_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_update_requests r
      WHERE r.id = request_id
        AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users insert messages on own requests"
  ON public.request_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.site_update_requests r
      WHERE r.id = request_id
        AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
