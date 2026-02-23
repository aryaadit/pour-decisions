import { useNavigate } from 'react-router-dom';
import { useDiscovery } from '@/hooks/useDiscovery';
import { StorageAvatar } from '@/components/StorageAvatar';
import { FollowButton } from '@/components/FollowButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Wine } from 'lucide-react';
import { SuggestedUser } from '@/types/social';

function SuggestedUserCard({ user }: { user: SuggestedUser }) {
  const navigate = useNavigate();
  const displayName = user.displayName || user.username || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2">
      <StorageAvatar
        storagePath={user.avatarUrl}
        fallback={initial}
        className="h-10 w-10 flex-shrink-0 cursor-pointer"
        onClick={() => user.username && navigate(`/u/${user.username}`)}
      />

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => user.username && navigate(`/u/${user.username}`)}
      >
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {user.username && <span>@{user.username}</span>}
          {user.recentDrinkCount > 0 && (
            <>
              <span className="mx-1">&middot;</span>
              <Wine className="h-3 w-3" />
              <span>{user.recentDrinkCount} recent</span>
            </>
          )}
        </div>
      </div>

      <FollowButton
        userId={user.userId}
        username={user.username}
        size="sm"
      />
    </div>
  );
}

export function SuggestedUsersSection() {
  const { suggestedUsers, suggestedLoading } = useDiscovery();

  if (suggestedLoading) {
    return (
      <div className="space-y-3 px-4">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (suggestedUsers.length === 0) return null;

  return (
    <div className="px-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Suggested People
      </h3>
      <div className="space-y-1">
        {suggestedUsers.map((user) => (
          <SuggestedUserCard key={user.userId} user={user} />
        ))}
      </div>
    </div>
  );
}
