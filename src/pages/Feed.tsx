import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useIsMobile } from '@/hooks/use-mobile';

import { PageHeader } from '@/components/PageHeader';
import { ActivityCard } from '@/components/ActivityCard';
import { UserSearch } from '@/components/UserSearch';
import { UsernameSetup } from '@/components/UsernameSetup';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Drink } from '@/types/drink';
import { DrinkOwner } from '@/components/DrinkDetailModal';

export default function Feed() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { activities, isLoading: feedLoading, hasMore, loadMore } = useActivityFeed();
  const isMobile = useIsMobile();
  
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);
  const [viewingOwner, setViewingOwner] = useState<DrinkOwner | null>(null);

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

  const handleDrinkClick = (drink: Drink, owner: DrinkOwner) => {
    setViewingDrink(drink);
    setViewingOwner(owner);
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
      <PageHeader
        title="Feed"
        icon={<Activity className="h-5 w-5" />}
        showBack={true}
      />

      {/* Search Section */}
      <div className="max-w-2xl mx-auto px-4 py-2 border-b border-border/50">
        <UserSearch placeholder="Find people to follow..." />
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-3">
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
          <div className="space-y-2">
            {activities.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity}
                onDrinkClick={handleDrinkClick}
              />
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

      {/* Drink Detail Modal - Read-only for feed items */}
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

      {/* Username Setup Modal */}
      <UsernameSetup 
        open={showUsernameSetup} 
        onComplete={handleUsernameSetupComplete} 
      />

      {/* Spacer for bottom nav */}
      {isMobile && <div className="h-20" />}
    </div>
  );
}
