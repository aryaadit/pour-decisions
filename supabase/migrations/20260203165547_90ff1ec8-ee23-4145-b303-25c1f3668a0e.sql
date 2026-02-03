-- Make all storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('avatars', 'drink-images', 'bug-attachments');

-- Add SELECT policies for authenticated users to read files
-- Avatars: Anyone authenticated can view avatars (needed for profiles, activity feeds)
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Drink images: Anyone authenticated can view drink images (needed for shared collections, feeds)
CREATE POLICY "Authenticated users can view drink images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'drink-images');

-- Bug attachments: Only admins can view bug attachments
CREATE POLICY "Admins can view bug attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bug-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Users can view their own bug attachments
CREATE POLICY "Users can view their own bug attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bug-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);