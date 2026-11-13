-- Storage buckets for HooNext assets

-- Templates bucket (thumbnail images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Blogs bucket (cover images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blogs',
  'blogs',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Avatars bucket (user profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS policies ──────────────────────────────────────────────────────

-- TEMPLATES bucket: public read, admin write only
CREATE POLICY "Templates bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'templates');

CREATE POLICY "Templates bucket admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Templates bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Templates bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

-- BLOGS bucket: public read, admin write only
CREATE POLICY "Blogs bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blogs');

CREATE POLICY "Blogs bucket admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blogs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Blogs bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blogs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Blogs bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blogs' AND public.has_role(auth.uid(), 'admin'));

-- AVATARS bucket: public read, owner write
CREATE POLICY "Avatars bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatars bucket owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars bucket owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars bucket owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
