import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

interface StorageAvatarProps {
  storagePath: string | undefined | null;
  fallback: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Avatar component that handles Supabase storage signed URLs.
 * Pass the storage path (bucket/path) or full public URL, and this component
 * will automatically fetch a signed URL for private buckets.
 */
export function StorageAvatar({
  storagePath,
  fallback,
  className,
  onClick,
}: StorageAvatarProps) {
  const { signedUrl, isLoading } = useSignedUrl(storagePath);

  return (
    <Avatar className={cn(className)} onClick={onClick}>
      {signedUrl && !isLoading && (
        <img 
          src={signedUrl} 
          alt="" 
          className="aspect-square h-full w-full object-cover" 
        />
      )}
      <AvatarFallback className="bg-primary/10 text-primary">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
