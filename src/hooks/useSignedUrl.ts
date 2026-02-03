import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cache for signed URLs to avoid redundant requests
const urlCache = new Map<string, { url: string; expiresAt: number }>();

// Extract bucket and path from a Supabase storage URL
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  // Handle both old public URLs and new path-only format
  // Old format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path
  // New format: bucket-name/path (just the path we store)
  
  if (!url) return null;
  
  // Check if it's a full URL
  if (url.startsWith('http')) {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
    return null;
  }
  
  // Otherwise, assume it's bucket/path format
  const parts = url.split('/');
  if (parts.length >= 2) {
    const bucket = parts[0];
    const path = parts.slice(1).join('/');
    return { bucket, path };
  }
  
  return null;
}

// Get a signed URL for a storage file
export async function getSignedUrl(
  urlOrPath: string,
  expiresIn = 3600 // 1 hour default
): Promise<string | null> {
  if (!urlOrPath) return null;
  
  // Check cache first
  const cached = urlCache.get(urlOrPath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  
  const parsed = parseStorageUrl(urlOrPath);
  if (!parsed) {
    // If we can't parse it, return the original (might be an external URL)
    return urlOrPath;
  }
  
  const { bucket, path } = parsed;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error || !data?.signedUrl) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  
  // Cache the result with expiry buffer (5 minutes before actual expiry)
  urlCache.set(urlOrPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + (expiresIn - 300) * 1000,
  });
  
  return data.signedUrl;
}

// Hook for reactive signed URL fetching
export function useSignedUrl(urlOrPath: string | undefined | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!urlOrPath) {
      setSignedUrl(null);
      setIsLoading(false);
      return;
    }

    // If it's an external URL (not Supabase storage), use it directly
    if (urlOrPath.startsWith('http') && !urlOrPath.includes('supabase.co/storage')) {
      setSignedUrl(urlOrPath);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    getSignedUrl(urlOrPath)
      .then((url) => {
        if (mountedRef.current) {
          setSignedUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err);
          setIsLoading(false);
        }
      });
  }, [urlOrPath]);

  return { signedUrl, isLoading, error };
}

// Hook for batch fetching multiple signed URLs
export function useSignedUrls(urlsOrPaths: (string | undefined | null)[]) {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const validUrls = urlsOrPaths.filter((u): u is string => !!u);
    if (validUrls.length === 0) {
      setSignedUrls(new Map());
      return;
    }

    setIsLoading(true);

    Promise.all(
      validUrls.map(async (url) => {
        const signed = await getSignedUrl(url);
        return [url, signed] as [string, string | null];
      })
    ).then((results) => {
      const urlMap = new Map<string, string>();
      results.forEach(([original, signed]) => {
        if (signed) urlMap.set(original, signed);
      });
      setSignedUrls(urlMap);
      setIsLoading(false);
    });
  }, [JSON.stringify(urlsOrPaths)]);

  return { signedUrls, isLoading };
}

// Clear the URL cache (useful when logging out)
export function clearSignedUrlCache() {
  urlCache.clear();
}
