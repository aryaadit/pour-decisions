import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageAvatar } from '@/components/StorageAvatar';
import { useFollowRequests } from '@/hooks/useFollowRequests';
import { useHaptics } from '@/hooks/useHaptics';
import { ImpactStyle } from '@capacitor/haptics';
import { toast } from 'sonner';
import { FollowRequest } from '@/types/social';

interface FollowRequestCardProps {
  request: FollowRequest;
}

export function FollowRequestCard({ request }: FollowRequestCardProps) {
  const navigate = useNavigate();
  const { accept, reject } = useFollowRequests();
  const { impact } = useHaptics();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const profile = request.requester;
  const displayName = profile?.displayName || profile?.username || 'Someone';
  const initial = displayName.charAt(0).toUpperCase();

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAccepting(true);
    impact(ImpactStyle.Light);
    try {
      await accept(request.id);
      toast.success(`Accepted ${displayName}'s request`);
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRejecting(true);
    impact(ImpactStyle.Light);
    try {
      await reject(request.id);
      toast.success('Request declined');
    } catch {
      toast.error('Failed to decline request');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleNavigate = () => {
    if (profile?.username) {
      navigate(`/u/${profile.username}`);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleNavigate}
    >
      <StorageAvatar
        storagePath={profile?.avatarUrl}
        fallback={initial}
        className="h-10 w-10 flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        {profile?.username && (
          <p className="text-xs text-muted-foreground truncate">
            @{profile.username}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isAccepting || isRejecting}
          className="h-8 px-3"
        >
          {isAccepting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReject}
          disabled={isAccepting || isRejecting}
          className="h-8 px-3"
        >
          {isRejecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
