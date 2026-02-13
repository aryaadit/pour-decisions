import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfileStats, TopDrink } from '@/hooks/useProfileStats';
import { queryKeys } from '@/lib/queryKeys';

import { PageHeader } from '@/components/PageHeader';
import { FollowListModal } from '@/components/FollowListModal';
import { DrinkDetailModal, DrinkOwner } from '@/components/DrinkDetailModal';
import { CollectionCompareSection } from '@/components/CollectionCompareSection';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { OverviewTab } from '@/components/profile/OverviewTab';
import { ActivityTab } from '@/components/profile/ActivityTab';
import { PublicProfile, ActivityFeedItem } from '@/types/social';
import { Drink } from '@/types/drink';
import * as feedService from '@/services/feedService';
import * as drinkService from '@/services/drinkService';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getProfileByUsername, isLoading: profileLoading } = useSocialProfile();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [followListType, setFollowListType] = useState<'Followers' | 'Following' | null>(null);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);
  const [viewingOwner, setViewingOwner] = useState<DrinkOwner | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const {
    followCounts,
    isFollowing,
    followers,
    following,
    fetchFollowers,
    fetchFollowing,
  } = useFollows(profile?.userId);

  const isOwnProfile = user?.id === profile?.userId;

  const canViewActivity = () => {
    if (isOwnProfile) return true;
    if (profile?.activityVisibility === 'public') return true;
    if (profile?.activityVisibility === 'followers' && isFollowing) return true;
    return false;
  };

  const { stats, topDrinks, isLoading: statsLoading, canViewStats } = useProfileStats(
    profile?.userId,
    isOwnProfile,
    canViewActivity(),
    profile?.createdAt || null
  );

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: queryKeys.feed.userActivities(profile?.userId ?? ''),
    queryFn: async () => {
      const items = await feedService.fetchUserActivities(profile!.userId);
      return items.map((item) => ({ ...item, user: profile! }));
    },
    enabled: !!profile?.userId && canViewActivity(),
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;
      const fetchedProfile = await getProfileByUsername(username);
      setProfile(fetchedProfile);
    };
    loadProfile();
  }, [username, getProfileByUsername]);

  const ownerFromProfile = profile
    ? { username: profile.username || '', displayName: profile.displayName || undefined }
    : null;

  const handleDrinkClick = (drink: Drink, owner: DrinkOwner) => {
    setViewingDrink(drink);
    setViewingOwner(owner);
  };

  const handleTopDrinkClick = async (topDrink: TopDrink) => {
    const drink = await drinkService.fetchPublicDrinkById(topDrink.id);
    if (drink) {
      setViewingDrink(drink);
      setViewingOwner(ownerFromProfile);
    }
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/u/${profile?.username}`;
    const shareData = {
      title: `${profile?.displayName || profile?.username}'s Profile`,
      text: `Check out ${profile?.displayName || profile?.username} on Barkeeply`,
      url: profileUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(profileUrl);
        }
      }
    } else {
      copyToClipboard(profileUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-10 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">User not found</h1>
          <p className="text-muted-foreground mb-4">
            This user doesn't exist or hasn't set up their profile yet.
          </p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={`@${profile.username}`}
        showBack={true}
        rightContent={
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        }
      />

      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        followCounts={followCounts}
        canViewStats={canViewStats}
        stats={stats}
        onFollowersClick={async () => {
          setFollowListType('Followers');
          setFollowListLoading(true);
          await fetchFollowers(profile.userId);
          setFollowListLoading(false);
        }}
        onFollowingClick={async () => {
          setFollowListType('Following');
          setFollowListLoading(true);
          await fetchFollowing(profile.userId);
          setFollowListLoading(false);
        }}
      />

      <div className="max-w-2xl mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <OverviewTab
              canViewStats={canViewStats}
              activityVisibility={profile.activityVisibility}
              stats={stats}
              topDrinks={topDrinks}
              statsLoading={statsLoading}
              onTopDrinkClick={handleTopDrinkClick}
            />
          </TabsContent>

          <TabsContent value="network" className="mt-4 space-y-8">
            <CollectionCompareSection
              profileUserId={profile.userId}
              profile={profile}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowing}
              canViewActivity={canViewActivity()}
              onDrinkClick={(drink) => {
                setViewingDrink(drink);
                setViewingOwner(ownerFromProfile);
              }}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityTab
              canViewActivity={canViewActivity()}
              activityVisibility={profile.activityVisibility}
              activities={activities}
              activitiesLoading={activitiesLoading}
              onDrinkClick={handleDrinkClick}
            />
          </TabsContent>
        </Tabs>
      </div>

      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => {
          if (!open) {
            setViewingDrink(null);
            setViewingOwner(null);
          }
        }}
        readOnly={true}
        owner={viewingOwner}
      />

      <FollowListModal
        open={followListType !== null}
        onOpenChange={(open) => !open && setFollowListType(null)}
        title={followListType || 'Followers'}
        users={followListType === 'Followers' ? followers : following}
        isLoading={followListLoading}
      />

      {isMobile && <div className="h-20" />}
    </div>
  );
}
