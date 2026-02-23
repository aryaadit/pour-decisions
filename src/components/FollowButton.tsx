import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { ResponsiveModal } from '@/components/ResponsiveModal';
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
  className,
}: FollowButtonProps) {
  const { user } = useAuth();
  const { relationship, follow, unfollow, cancelRequest, isMutating } = useFollows(userId);
  const { impact } = useHaptics();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'unfollow' | 'cancel'>('unfollow');

  // Don't show button for own profile or if not logged in
  if (!user || user.id === userId) return null;

  const displayName = username ? `@${username}` : 'this user';

  const handleFollowClick = async () => {
    impact(ImpactStyle.Light);
    const { error, result } = await follow(userId);
    if (error) {
      toast.error('Failed to follow');
    } else if (result === 'requested') {
      toast.success(`Follow request sent to ${displayName}`);
    } else {
      toast.success(`Following ${displayName}`);
    }
  };

  const handleConfirmAction = async () => {
    impact(ImpactStyle.Medium);
    setConfirmOpen(false);

    if (confirmAction === 'unfollow') {
      const { error } = await unfollow(userId);
      if (error) {
        toast.error('Failed to unfollow');
      } else {
        toast.success(`Unfollowed ${displayName}`);
      }
    } else {
      const { error } = await cancelRequest(userId);
      if (error) {
        toast.error('Failed to cancel request');
      } else {
        toast.success('Follow request cancelled');
      }
    }
  };

  const openConfirm = (action: 'unfollow' | 'cancel') => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  if (relationship === 'following') {
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={() => openConfirm('unfollow')}
          disabled={isMutating}
          className={className}
        >
          {isMutating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              Following
            </>
          )}
        </Button>

        <ResponsiveModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Unfollow ${displayName}?`}
          description="They won't be notified. You can always follow them again."
          footer={
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmAction}
              >
                Unfollow
              </Button>
            </div>
          }
        >
          <div />
        </ResponsiveModal>
      </>
    );
  }

  if (relationship === 'requested') {
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={() => openConfirm('cancel')}
          disabled={isMutating}
          className={`text-muted-foreground ${className ?? ''}`}
        >
          {isMutating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Requested
            </>
          )}
        </Button>

        <ResponsiveModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Cancel request to ${displayName}?`}
          description="Your follow request will be withdrawn."
          footer={
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmOpen(false)}
              >
                Keep Request
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmAction}
              >
                Cancel Request
              </Button>
            </div>
          }
        >
          <div />
        </ResponsiveModal>
      </>
    );
  }

  // relationship === 'none'
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleFollowClick}
      disabled={isMutating}
      className={className}
    >
      {isMutating ? (
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
