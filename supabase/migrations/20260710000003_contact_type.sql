-- Add type column to contact_submissions for distinguishing custom website requests
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';
