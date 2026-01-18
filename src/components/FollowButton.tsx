import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { ImpactStyle } from '@capacitor/haptics';
import { toast } from 'sonner';

interface FollowButtonProps {
  userId: string;
  username?: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function FollowButton({ 
  userId, 
  username,
  variant = 'default',
  size = 'default',
  className 
}: FollowButtonProps) {
  const { user } = useAuth();
  const { isFollowing, follow, unfollow } = useFollows(userId);
  const { impact } = useHaptics();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show button for own profile or if not logged in
  if (!user || user.id === userId) return null;

  const handleClick = async () => {
    setIsLoading(true);
    impact(ImpactStyle.Light);

    if (isFollowing) {
      const { error } = await unfollow(userId);
      if (error) {
        toast.error('Failed to unfollow');
      } else {
        toast.success(`Unfollowed ${username || 'user'}`);
      }
    } else {
      const { error } = await follow(userId);
      if (error) {
        toast.error('Failed to follow');
      } else {
        toast.success(`Following ${username || 'user'}`);
      }
    }

    setIsLoading(false);
  };

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserCheck className="h-4 w-4 mr-2" />
            Following
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
}
