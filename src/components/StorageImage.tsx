import { useState } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  storagePath: string | undefined | null;
  fallback?: React.ReactNode;
  showLoader?: boolean;
}

/**
 * Image component that handles Supabase storage signed URLs.
 * Pass the storage path (bucket/path) or full public URL, and this component
 * will automatically fetch a signed URL for private buckets.
 */
export function StorageImage({
  storagePath,
  fallback,
  showLoader = true,
  className,
  alt = '',
  ...props
}: StorageImageProps) {
  const { signedUrl, isLoading } = useSignedUrl(storagePath);
  const [imageError, setImageError] = useState(false);

  // No path provided
  if (!storagePath) {
    return fallback ? <>{fallback}</> : null;
  }

  // Loading state
  if (isLoading && showLoader) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error or no URL
  if (!signedUrl || imageError) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      {...props}
    />
  );
}
