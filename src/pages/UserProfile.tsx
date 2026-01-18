import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Globe, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import BottomNavigation from '@/components/BottomNavigation';
import { FollowButton } from '@/components/FollowButton';
import { ActivityCard } from '@/components/ActivityCard';
import { PublicProfile, ActivityFeedItem } from '@/types/social';
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

  const { followCounts, isFollowing, isLoading: followsLoading } = useFollows(profile?.userId);

  const isOwnProfile = user?.id === profile?.userId;

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) return;
      const fetchedProfile = await getProfileByUsername(username);
      setProfile(fetchedProfile);
    };
    loadProfile();
  }, [username, getProfileByUsername]);

  useEffect(() => {
    const loadActivities = async () => {
      if (!profile?.userId) return;

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
  }, [profile]);

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

  const canViewActivity = () => {
    if (isOwnProfile) return true;
    if (profile?.activityVisibility === 'public') return true;
    if (profile?.activityVisibility === 'followers' && isFollowing) return true;
    return false;
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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">@{profile.username}</h1>
        </div>
      </header>

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

            {/* Stats */}
            <div className="flex gap-4 mt-3">
              <button className="text-sm hover:underline">
                <span className="font-semibold">{followCounts.followers}</span>{' '}
                <span className="text-muted-foreground">followers</span>
              </button>
              <button className="text-sm hover:underline">
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

      {/* Activity Tab */}
      <div className="max-w-2xl mx-auto px-4">
        <Tabs defaultValue="activity">
          <TabsList className="w-full">
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          </TabsList>

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
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}
