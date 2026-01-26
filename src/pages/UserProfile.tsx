import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Globe, Users, Share2, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfileStats, TopDrink } from '@/hooks/useProfileStats';

import { PageHeader } from '@/components/PageHeader';
import { FollowButton } from '@/components/FollowButton';
import { ActivityCard } from '@/components/ActivityCard';
import { FollowListModal } from '@/components/FollowListModal';
import { DrinkDetailModal, DrinkOwner } from '@/components/DrinkDetailModal';
import { ProfileStatsCard } from '@/components/ProfileStatsCard';
import { TopDrinksShowcase } from '@/components/TopDrinksShowcase';
import { ProfileCollectionsShowcase } from '@/components/ProfileCollectionsShowcase';
import { CollectionCompareSection } from '@/components/CollectionCompareSection';
import { PublicProfile, ActivityFeedItem } from '@/types/social';
import { Drink, Collection } from '@/types/drink';
import { supabase } from '@/integrations/supabase/client';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getProfileByUsername, isLoading: profileLoading } = useSocialProfile();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [followListType, setFollowListType] = useState<'Followers' | 'Following' | null>(null);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);
  const [viewingOwner, setViewingOwner] = useState<DrinkOwner | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  // Note: 'network' tab shows Network Comparison for own profile, Collections Compare for others

  const { 
    followCounts, 
    isFollowing, 
    isLoading: followsLoading,
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;
      const fetchedProfile = await getProfileByUsername(username);
      setProfile(fetchedProfile);
    };
    loadProfile();
  }, [username, getProfileByUsername]);

  // Load activities when switching to Activity tab or when profile changes
  useEffect(() => {
    const loadActivities = async () => {
      if (!profile?.userId || activeTab !== 'activity') return;
      if (!canViewActivity()) return;

      setActivitiesLoading(true);
      
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', profile.userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setActivities(data.map(item => ({
          id: item.id,
          userId: item.user_id,
          activityType: item.activity_type as 'drink_added' | 'drink_rated' | 'wishlist_added',
          drinkId: item.drink_id,
          metadata: item.metadata as ActivityFeedItem['metadata'],
          createdAt: new Date(item.created_at),
          user: profile,
        })));
      }

      setActivitiesLoading(false);
    };

    loadActivities();
  }, [profile, activeTab]);

  // Load collections when switching to Network tab (only for other users' profiles)
  useEffect(() => {
    const loadCollections = async () => {
      if (!profile?.userId || activeTab !== 'network' || isOwnProfile) return;

      setCollectionsLoading(true);

      // Query collections that are public for this user
      const { data, error } = await supabase
        .from('collections')
        .select('*, collection_drinks(count)')
        .eq('user_id', profile.userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCollections(data.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description || undefined,
          icon: c.icon || '📚',
          coverColor: c.cover_color || '#8B5CF6',
          shareId: c.share_id || '',
          isPublic: c.is_public || false,
          isSystem: c.is_system || false,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
          drinkCount: (c.collection_drinks as { count: number }[])?.[0]?.count || 0,
        })));
      }

      setCollectionsLoading(false);
    };

    loadCollections();
  }, [profile, activeTab]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getVisibilityIcon = () => {
    switch (profile?.activityVisibility) {
      case 'public':
        return <Globe className="h-3 w-3" />;
      case 'followers':
        return <Users className="h-3 w-3" />;
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const handleDrinkClick = (drink: Drink, owner: DrinkOwner) => {
    setViewingDrink(drink);
    setViewingOwner(owner);
  };

  const handleTopDrinkClick = async (topDrink: TopDrink) => {
    // Fetch full drink data for the modal
    const { data } = await supabase
      .from('drinks_public')
      .select('*')
      .eq('id', topDrink.id)
      .maybeSingle();

    if (data) {
      const drink: Drink = {
        id: data.id,
        name: data.name,
        type: data.type,
        brand: data.brand || undefined,
        rating: data.rating || 0,
        dateAdded: new Date(data.date_added),
        imageUrl: data.image_url || undefined,
        isWishlist: data.is_wishlist || false,
      };
      setViewingDrink(drink);
      setViewingOwner(profile ? {
        username: profile.username || '',
        displayName: profile.displayName || undefined,
      } : null);
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
      {/* Header */}
      <PageHeader
        title={`@${profile.username}`}
        showBack={true}
        rightContent={
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        }
      />

      {/* Profile Info */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {getInitials(profile.displayName || profile.username)}
            </AvatarFallback>
          </Avatar>

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

            {/* Stats Row */}
            <div className="flex gap-4 mt-3 flex-wrap">
              {/* Drinks count */}
              {canViewStats && stats && (
                <div className="text-sm flex items-center gap-1">
                  <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">{stats.totalDrinks}</span>{' '}
                  <span className="text-muted-foreground">drinks</span>
                </div>
              )}
              
              <button 
                className="text-sm hover:underline"
                onClick={async () => {
                  setFollowListType('Followers');
                  setFollowListLoading(true);
                  await fetchFollowers(profile.userId);
                  setFollowListLoading(false);
                }}
              >
                <span className="font-semibold">{followCounts.followers}</span>{' '}
                <span className="text-muted-foreground">followers</span>
              </button>
              <button 
                className="text-sm hover:underline"
                onClick={async () => {
                  setFollowListType('Following');
                  setFollowListLoading(true);
                  await fetchFollowing(profile.userId);
                  setFollowListLoading(false);
                }}
              >
                <span className="font-semibold">{followCounts.following}</span>{' '}
                <span className="text-muted-foreground">following</span>
              </button>
            </div>

            {/* Follow Button */}
            {!isOwnProfile && (
              <div className="mt-4">
                <FollowButton 
                  userId={profile.userId} 
                  username={profile.username}
                />
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

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            {!canViewStats ? (
              <div className="text-center py-12">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Stats are private</h3>
                <p className="text-muted-foreground text-sm">
                  {profile.activityVisibility === 'followers'
                    ? 'Follow this user to see their stats'
                    : 'This user keeps their stats private'}
                </p>
              </div>
            ) : (
              <>
                <ProfileStatsCard stats={stats} isLoading={statsLoading} />
                <TopDrinksShowcase 
                  drinks={topDrinks} 
                  isLoading={statsLoading}
                  onDrinkClick={handleTopDrinkClick}
                />
                
                {/* Empty state when no drinks */}
                {!statsLoading && stats?.totalDrinks === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wine className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No drinks logged yet</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Network/Collections Tab */}
          <TabsContent value="network" className="mt-4 space-y-8">
            {/* Collection Comparison Section (Network view for own profile, Compare for others) */}
            <CollectionCompareSection
              profileUserId={profile.userId}
              profile={profile}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowing}
              canViewActivity={canViewActivity()}
              onDrinkClick={(drink) => {
                setViewingDrink(drink);
                setViewingOwner(profile ? {
                  username: profile.username || '',
                  displayName: profile.displayName || undefined,
                } : null);
              }}
            />

          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            {!canViewActivity() ? (
              <div className="text-center py-12">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Activity is private</h3>
                <p className="text-muted-foreground text-sm">
                  {profile.activityVisibility === 'followers'
                    ? 'Follow this user to see their activity'
                    : 'This user keeps their activity private'}
                </p>
              </div>
            ) : activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No activity yet
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity}
                    onDrinkClick={handleDrinkClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Drink Detail Modal */}
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

      {/* Follow List Modal */}
      <FollowListModal
        open={followListType !== null}
        onOpenChange={(open) => !open && setFollowListType(null)}
        title={followListType || 'Followers'}
        users={followListType === 'Followers' ? followers : following}
        isLoading={followListLoading}
      />

      {/* Spacer for bottom nav */}
      {isMobile && <div className="h-20" />}
    </div>
  );
}
