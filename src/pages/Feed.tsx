import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import BottomNavigation from '@/components/BottomNavigation';
import { ActivityCard } from '@/components/ActivityCard';
import { UserSearch } from '@/components/UserSearch';
import { UsernameSetup } from '@/components/UsernameSetup';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function Feed() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { activities, isLoading: feedLoading, hasMore, loadMore } = useActivityFeed();
  const isMobile = useIsMobile();
  
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Show username setup if user hasn't set one
  useEffect(() => {
    if (!profileLoading && profile && !(profile as any).username) {
      setShowUsernameSetup(true);
    }
  }, [profile, profileLoading]);

  const handleUsernameSetupComplete = () => {
    setShowUsernameSetup(false);
    refetchProfile();
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const hasNoFollowing = activities.length === 0 && !feedLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Feed
            </h1>
          </div>
          <UserSearch placeholder="Find people to follow..." />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {feedLoading && activities.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : hasNoFollowing ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Your feed is empty
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Follow friends to see their drink discoveries and ratings in your feed.
            </p>
            <Button onClick={() => document.querySelector('input')?.focus()}>
              <Search className="h-4 w-4 mr-2" />
              Find People
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}

            {hasMore && (
              <div className="text-center py-4">
                <Button variant="outline" onClick={loadMore} disabled={feedLoading}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Username Setup Modal */}
      <UsernameSetup 
        open={showUsernameSetup} 
        onComplete={handleUsernameSetupComplete} 
      />

      {/* Bottom Navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}
