-- ──────────────────────────────────────────────────────────────────────────────
-- Image uploads migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Add image URL columns to tables
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE groups  ADD COLUMN IF NOT EXISTS logo_url   TEXT;

-- 2. Create storage buckets (public = anyone can view images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',    'avatars',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('team-logos', 'team-logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies — avatars bucket
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Auth users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Auth users can update their avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Auth users can delete their avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- 4. Storage policies — team-logos bucket
CREATE POLICY "Public read team logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'team-logos');

CREATE POLICY "Auth users can upload team logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "Auth users can update team logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'team-logos');

CREATE POLICY "Auth users can delete team logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'team-logos');
