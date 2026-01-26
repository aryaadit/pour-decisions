import { useState, useEffect } from 'react';
import { Sparkles, Wine, Users, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Drink } from '@/types/drink';
import { PublicProfile } from '@/types/social';
import { cn } from '@/lib/utils';

interface CollectionCompareSectionProps {
  profileUserId: string;
  profile: PublicProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  canViewActivity: boolean;
  onDrinkClick?: (drink: Drink) => void;
}

interface DrinkCompare {
  id: string;
  name: string;
  type: string;
  imageUrl?: string;
  rating?: number;
  brand?: string;
}

interface ComparisonData {
  sharedDrinks: DrinkCompare[];
  discoveryDrinks: DrinkCompare[];
  myDrinksCount: number;
  theirDrinksCount: number;
}

export function CollectionCompareSection({
  profileUserId,
  profile,
  isOwnProfile,
  isFollowing,
  canViewActivity,
  onDrinkClick,
}: CollectionCompareSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllShared, setShowAllShared] = useState(false);
  const [showAllDiscovery, setShowAllDiscovery] = useState(false);

  useEffect(() => {
    const fetchComparison = async () => {
      // Only compare if logged in, not own profile, and can view their activity
      if (!user || isOwnProfile || !canViewActivity) return;

      setIsLoading(true);

      try {
        // Fetch current user's drinks (by name for matching since IDs differ between users)
        const { data: myDrinksData } = await supabase
          .from('drinks')
          .select('id, name, type, brand, rating, image_url')
          .eq('user_id', user.id)
          .eq('is_wishlist', false);

        // Fetch profile user's public drinks
        const { data: theirDrinksData } = await supabase
          .from('drinks_public')
          .select('id, name, type, brand, rating, image_url')
          .eq('user_id', profileUserId)
          .eq('is_wishlist', false);

        if (!myDrinksData || !theirDrinksData) {
          setComparison(null);
          setIsLoading(false);
          return;
        }

        // Normalize drink names for comparison (lowercase, trim)
        const myDrinkNames = new Set(
          myDrinksData.map(d => `${d.name?.toLowerCase().trim()}|${d.type?.toLowerCase()}`)
        );
        const theirDrinkNames = new Set(
          theirDrinksData.map(d => `${d.name?.toLowerCase().trim()}|${d.type?.toLowerCase()}`)
        );

        // Find shared drinks (drinks with same name and type)
        const sharedDrinks: DrinkCompare[] = theirDrinksData
          .filter(d => myDrinkNames.has(`${d.name?.toLowerCase().trim()}|${d.type?.toLowerCase()}`))
          .map(d => ({
            id: d.id || '',
            name: d.name || '',
            type: d.type || '',
            imageUrl: d.image_url || undefined,
            rating: d.rating || undefined,
            brand: d.brand || undefined,
          }));

        // Find discovery drinks (drinks they have that I don't)
        const discoveryDrinks: DrinkCompare[] = theirDrinksData
          .filter(d => !myDrinkNames.has(`${d.name?.toLowerCase().trim()}|${d.type?.toLowerCase()}`))
          .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Sort by rating
          .slice(0, 10) // Limit to top 10 suggestions
          .map(d => ({
            id: d.id || '',
            name: d.name || '',
            type: d.type || '',
            imageUrl: d.image_url || undefined,
            rating: d.rating || undefined,
            brand: d.brand || undefined,
          }));

        setComparison({
          sharedDrinks,
          discoveryDrinks,
          myDrinksCount: myDrinksData.length,
          theirDrinksCount: theirDrinksData.length,
        });
      } catch (error) {
        console.error('Error fetching comparison:', error);
      }

      setIsLoading(false);
    };

    fetchComparison();
  }, [user, profileUserId, isOwnProfile, canViewActivity]);

  const handleDrinkClick = async (drink: DrinkCompare) => {
    if (!onDrinkClick) return;
    
    // Construct a minimal Drink object for the modal
    const fullDrink: Drink = {
      id: drink.id,
      name: drink.name,
      type: drink.type,
      brand: drink.brand,
      rating: drink.rating || 0,
      imageUrl: drink.imageUrl,
      dateAdded: new Date(),
      isWishlist: false,
    };
    onDrinkClick(fullDrink);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Not logged in - prompt to sign in
  if (!user) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-2">Compare Collections</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in to see which drinks you have in common with {profile.displayName || profile.username}
        </p>
        <Button onClick={() => navigate('/auth')}>
          Sign In
        </Button>
      </div>
    );
  }

  // Own profile - can't compare with self
  if (isOwnProfile) {
    return null;
  }

  // Can't view their activity
  if (!canViewActivity) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-2">Collection Comparison Locked</h3>
        <p className="text-sm text-muted-foreground">
          {profile.activityVisibility === 'followers'
            ? 'Follow this user to compare your drink collections'
            : 'This user keeps their collection private'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!comparison) return null;

  const sharedToShow = showAllShared ? comparison.sharedDrinks : comparison.sharedDrinks.slice(0, 4);
  const discoveryToShow = showAllDiscovery ? comparison.discoveryDrinks : comparison.discoveryDrinks.slice(0, 4);

  const overlapPercent = comparison.theirDrinksCount > 0
    ? Math.round((comparison.sharedDrinks.length / comparison.theirDrinksCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overlap Summary */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                You
              </AvatarFallback>
            </Avatar>
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(profile.displayName || profile.username || '?')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {comparison.sharedDrinks.length} drinks in common
            </p>
            <p className="text-xs text-muted-foreground">
              {overlapPercent}% overlap with their collection
            </p>
          </div>
        </div>
      </div>

      {/* Shared Drinks */}
      {comparison.sharedDrinks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              You Both Enjoy
            </h4>
            {comparison.sharedDrinks.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllShared(!showAllShared)}
                className="text-xs"
              >
                {showAllShared ? 'Show Less' : `+${comparison.sharedDrinks.length - 4} more`}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {sharedToShow.map((drink) => (
              <button
                key={drink.id}
                onClick={() => handleDrinkClick(drink)}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/50 transition-transform group-hover:scale-105 group-active:scale-95">
                  {drink.imageUrl ? (
                    <img
                      src={drink.imageUrl}
                      alt={drink.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wine className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-center mt-1 line-clamp-1 text-muted-foreground group-hover:text-foreground">
                  {drink.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Drinks */}
      {comparison.discoveryDrinks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Discover from {profile.displayName || profile.username}
            </h4>
            {comparison.discoveryDrinks.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllDiscovery(!showAllDiscovery)}
                className="text-xs"
              >
                {showAllDiscovery ? 'Show Less' : `+${comparison.discoveryDrinks.length - 4} more`}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {discoveryToShow.map((drink) => (
              <button
                key={drink.id}
                onClick={() => handleDrinkClick(drink)}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-amber-500/20 transition-transform group-hover:scale-105 group-active:scale-95 relative">
                  {drink.imageUrl ? (
                    <img
                      src={drink.imageUrl}
                      alt={drink.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wine className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {drink.rating && drink.rating >= 4 && (
                    <div className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] px-1 rounded font-medium">
                      ★ {drink.rating}
                    </div>
                  )}
                </div>
                <p className="text-xs text-center mt-1 line-clamp-1 text-muted-foreground group-hover:text-foreground">
                  {drink.name}
                </p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {comparison.discoveryDrinks.length} drinks you haven't tried yet
          </p>
        </div>
      )}

      {/* Empty state */}
      {comparison.sharedDrinks.length === 0 && comparison.discoveryDrinks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wine className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No drinks to compare yet</p>
          <p className="text-xs mt-1">
            Start logging drinks to see what you have in common!
          </p>
        </div>
      )}
    </div>
  );
}
