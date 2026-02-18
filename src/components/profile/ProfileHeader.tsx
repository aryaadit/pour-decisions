import { useNavigate } from 'react-router-dom';
import { Lock, Globe, Users, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageAvatar } from '@/components/StorageAvatar';
import { FollowButton } from '@/components/FollowButton';
import { PublicProfile, FollowCounts } from '@/types/social';
import { ProfileStats } from '@/hooks/useProfileStats';
import { getInitials } from '@/lib/utils';

interface ProfileHeaderProps {
  profile: PublicProfile;
  isOwnProfile: boolean;
  followCounts: FollowCounts;
  canViewStats: boolean;
  stats: ProfileStats | null;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  followCounts,
  canViewStats,
  stats,
  onFollowersClick,
  onFollowingClick,
}: ProfileHeaderProps) {
  const navigate = useNavigate();

  const getVisibilityIcon = () => {
    switch (profile.activityVisibility) {
      case 'public':
        return <Globe className="h-3 w-3" />;
      case 'followers':
        return <Users className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start gap-4">
        <StorageAvatar
          storagePath={profile.avatarUrl}
          fallback={getInitials(profile.displayName || profile.username)}
          className="h-20 w-20"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">
              {profile.displayName || profile.username}
            </h2>
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              {getVisibilityIcon()}
            </span>
          </div>

          {profile.displayName && (
            <p className="text-muted-foreground">@{profile.username}</p>
          )}

          {profile.bio && (
            <p className="mt-2 text-foreground">{profile.bio}</p>
          )}

          <div className="flex gap-4 mt-3 flex-wrap">
            {canViewStats && stats && (
              <div className="text-sm flex items-center gap-1">
                <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold">{stats.totalDrinks}</span>{' '}
                <span className="text-muted-foreground">drinks</span>
              </div>
            )}

            <button className="text-sm hover:underline min-h-[44px] px-1 inline-flex items-center gap-1 active:opacity-70" onClick={onFollowersClick}>
              <span className="font-semibold">{followCounts.followers}</span>
              <span className="text-muted-foreground">followers</span>
            </button>
            <button className="text-sm hover:underline min-h-[44px] px-1 inline-flex items-center gap-1 active:opacity-70" onClick={onFollowingClick}>
              <span className="font-semibold">{followCounts.following}</span>
              <span className="text-muted-foreground">following</span>
            </button>
          </div>

          {!isOwnProfile && (
            <div className="mt-4">
              <FollowButton userId={profile.userId} username={profile.username} />
            </div>
          )}

          {isOwnProfile && (
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/settings')}>
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
