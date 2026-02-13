import { supabase } from '@/integrations/supabase/client';

export async function uploadImage(
  bucket: string,
  userId: string,
  file: File | Blob
): Promise<string> {
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) throw error;
  return `${bucket}/${filePath}`;
}

// Re-export signed URL utilities
export { getSignedUrl, useSignedUrl, useSignedUrls, clearSignedUrlCache } from '@/hooks/useSignedUrl';
