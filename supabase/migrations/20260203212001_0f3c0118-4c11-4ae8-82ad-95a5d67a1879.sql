-- Fix: Drop old public storage policies that conflict with private access
-- These policies were created in earlier migrations but never removed when buckets were made private
-- When multiple SELECT policies exist, PostgreSQL allows access if ANY policy matches
-- So we need to remove these to properly enforce private storage access

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Drink images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Bug attachments are publicly accessible" ON storage.objects;