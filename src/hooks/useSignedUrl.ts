import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Extract bucket and path from a Supabase storage URL or path
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;

  // Full Supabase storage URL
  if (url.startsWith('http')) {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
    return null;
  }

  // bucket/path format (e.g. "drink-images/userId/file.jpg")
  const slashIndex = url.indexOf('/');
  if (slashIndex > 0) {
    return { bucket: url.substring(0, slashIndex), path: url.substring(slashIndex + 1) };
  }

  return null;
}

// Resolve a storage path to a public URL (synchronous, no API call)
export function resolveStorageUrl(urlOrPath: string): string | null {
  if (!urlOrPath) return null;

  // Already a full URL — use as-is
  if (urlOrPath.startsWith('http')) return urlOrPath;

  const parsed = parseStorageUrl(urlOrPath);
  if (!parsed) return null;

  const { data } = supabase.storage
    .from(parsed.bucket)
    .getPublicUrl(parsed.path);

  return data?.publicUrl || null;
}

// Keep the old export name for backward compatibility
export async function getSignedUrl(urlOrPath: string): Promise<string | null> {
  return resolveStorageUrl(urlOrPath);
}

// Hook for reactive URL resolution — synchronous since public buckets need no API call
export function useSignedUrl(urlOrPath: string | undefined | null) {
  const signedUrl = useMemo(() => {
    if (!urlOrPath) return null;
    return resolveStorageUrl(urlOrPath);
  }, [urlOrPath]);

  return { signedUrl, isLoading: false, error: null };
}

// Hook for batch resolving multiple storage URLs
export function useSignedUrls(urlsOrPaths: (string | undefined | null)[]) {
  const signedUrls = useMemo(() => {
    const urlMap = new Map<string, string>();
    for (const url of urlsOrPaths) {
      if (!url) continue;
      const resolved = resolveStorageUrl(url);
      if (resolved) urlMap.set(url, resolved);
    }
    return urlMap;
  }, [JSON.stringify(urlsOrPaths)]);

  return { signedUrls, isLoading: false };
}

// Clear the URL cache (no-op now, kept for API compatibility)
export function clearSignedUrlCache() {
  // Public URLs don't need caching — they're computed synchronously
}
