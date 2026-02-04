-- Make drink-images bucket public for read access (images are shared in social features)
-- This is safe because:
-- 1. Upload is still restricted to authenticated users uploading to their own folder
-- 2. Update/Delete still restricted to file owners
-- 3. The bucket contains non-sensitive drink photos intended for sharing

UPDATE storage.buckets 
SET public = true 
WHERE id = 'drink-images';

-- Similarly for avatars which are profile pictures meant to be publicly visible
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- bug-attachments should remain private (only admins can view)