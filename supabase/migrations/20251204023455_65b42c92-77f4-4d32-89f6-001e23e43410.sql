-- Add image_url column to drinks table
ALTER TABLE public.drinks ADD COLUMN image_url text;

-- Create storage bucket for drink images
INSERT INTO storage.buckets (id, name, public) VALUES ('drink-images', 'drink-images', true);

-- Storage policies for drink images
CREATE POLICY "Users can upload their own drink images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'drink-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own drink images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'drink-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own drink images"
ON storage.objects FOR DELETE
USING (bucket_id = 'drink-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Drink images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'drink-images');