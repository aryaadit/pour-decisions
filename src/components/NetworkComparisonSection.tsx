import { useState, useEffect } from 'react';
import { StorageImage } from '@/components/StorageImage';
import { Sparkles, Wine, Users, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Drink } from '@/types/drink';
import { cn } from '@/lib/utils';

interface NetworkComparisonSectionProps {
  onDrinkClick?: (drink: Drink) => void;
}

interface DrinkWithNetwork {
  id: string;
  name: string;
  type: string;
  imageUrl?: string;
  rating?: number;
  brand?: string;
  sharedByCount: number;
  sharedByUsers: { username: string; avatarUrl?: string }[];
}

interface NetworkData {
  popularWithNetwork: DrinkWithNetwork[];
  discoveryFromNetwork: DrinkWithNetwork[];
  myDrinksCount: number;
  followingCount: number;
  totalNetworkDrinks: number;
  overlapPercent: number;
}

export function NetworkComparisonSection({ onDrinkClick }: NetworkComparisonSectionProps) {
  const { user } = useAuth();
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllPopular, setShowAllPopular] = useState(false);
  const [showAllDiscovery, setShowAllDiscovery] = useState(false);

  useEffect(() => {
    const fetchNetworkComparison = async () => {
      if (!user) return;

      setIsLoading(true);

      try {
        // 1. Get list of users I'm following
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        if (!followsData || followsData.length === 0) {
          setNetworkData(null);
          setIsLoading(false);
          return;
        }

        const followingIds = followsData.map(f => f.following_id);

        // 2. Get my drinks
        const { data: myDrinksData } = await supabase
          .from('drinks')
          .select('id, name, type, brand, rating, image_url')
          .eq('user_id', user.id);

        // 3. Get all public drinks from people I follow
        const { data: networkDrinksData } = await supabase
          .from('drinks_public')
          .select('id, name, type, brand, rating, image_url, user_id')
          .in('user_id', followingIds);

        // 4. Get profiles for followed users to show avatars
        const { data: profilesData } = await supabase
          .from('profiles_public')
          .select('user_id, username, avatar_url')
          .in('user_id', followingIds);

        if (!myDrinksData || !networkDrinksData) {
          setNetworkData(null);
          setIsLoading(false);
          return;
        }

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, { username: p.username || '', avatarUrl: p.avatar_url || undefined }]) || []
        );

        // Normalize my drinks for comparison
        const myDrinkKeys = new Set(
          myDrinksData.map(d => `${d.name?.toLowerCase().trim()}|${d.type?.toLowerCase()}`)
        );

        // Aggregate network drinks by name|type
        const drinkAggregation = new Map<string, {
          drink: typeof networkDrinksData[0];
          sharedByUsers: { username: string; avatarUrl?: string }[];
        }>();

        for (const drink of networkDrinksData) {
          const key = `${drink.name?.toLowerCase().trim()}|${drink.type?.toLowerCase()}`;
          const userProfile = profilesMap.get(drink.user_id || '');
          
          if (drinkAggregation.has(key)) {
            const existing = drinkAggregation.get(key)!;
            if (userProfile && !existing.sharedByUsers.find(u => u.username === userProfile.username)) {
              existing.sharedByUsers.push(userProfile);
            }
          } else {
            drinkAggregation.set(key, {
              drink,
              sharedByUsers: userProfile ? [userProfile] : [],
            });
          }
        }

        // Find popular drinks I also have (sorted by how many in network have it)
        const popularWithNetwork: DrinkWithNetwork[] = [];
        const discoveryFromNetwork: DrinkWithNetwork[] = [];

        for (const [key, { drink, sharedByUsers }] of drinkAggregation) {
          const drinkItem: DrinkWithNetwork = {
            id: drink.id || '',
            name: drink.name || '',
            type: drink.type || '',
            imageUrl: drink.image_url || undefined,
            rating: drink.rating || undefined,
            brand: drink.brand || undefined,
            sharedByCount: sharedByUsers.length,
            sharedByUsers: sharedByUsers.slice(0, 3),
          };

          if (myDrinkKeys.has(key)) {
            popularWithNetwork.push(drinkItem);
          } else {
            discoveryFromNetwork.push(drinkItem);
          }
        }

        // Sort popular by count, discovery by rating and count
        popularWithNetwork.sort((a, b) => b.sharedByCount - a.sharedByCount);
        discoveryFromNetwork.sort((a, b) => {
          // Prioritize drinks shared by multiple users, then by rating
          const countDiff = b.sharedByCount - a.sharedByCount;
          if (countDiff !== 0) return countDiff;
          return (b.rating || 0) - (a.rating || 0);
        });

        const uniqueNetworkDrinks = drinkAggregation.size;
        const overlapPercent = uniqueNetworkDrinks > 0
          ? Math.round((popularWithNetwork.length / uniqueNetworkDrinks) * 100)
          : 0;

        setNetworkData({
          popularWithNetwork: popularWithNetwork.slice(0, 12),
          discoveryFromNetwork: discoveryFromNetwork.slice(0, 12),
          myDrinksCount: myDrinksData.length,
          followingCount: followingIds.length,
          totalNetworkDrinks: uniqueNetworkDrinks,
          overlapPercent,
        });
      } catch (error) {
        console.error('Error fetching network comparison:', error);
      }

      setIsLoading(false);
    };

    fetchNetworkComparison();
  }, [user]);

  const handleDrinkClick = (drink: DrinkWithNetwork) => {
    if (!onDrinkClick) return;
    
    const fullDrink: Drink = {
      id: drink.id,
      name: drink.name,
      type: drink.type,
      brand: drink.brand,
      rating: drink.rating || 0,
      imageUrl: drink.imageUrl,
      dateAdded: new Date(),
    };
    onDrinkClick(fullDrink);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!networkData) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-2">Your Network Comparison</h3>
        <p className="text-sm text-muted-foreground">
          Follow other users to see aggregate drink comparisons across your network
        </p>
      </div>
    );
  }

  const popularToShow = showAllPopular 
    ? networkData.popularWithNetwork 
    : networkData.popularWithNetwork.slice(0, 4);
  const discoveryToShow = showAllDiscovery 
    ? networkData.discoveryFromNetwork 
    : networkData.discoveryFromNetwork.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {networkData.overlapPercent}% network overlap
            </p>
            <p className="text-xs text-muted-foreground">
              {networkData.popularWithNetwork.length} drinks in common with {networkData.followingCount} {networkData.followingCount === 1 ? 'person' : 'people'} you follow
            </p>
          </div>
        </div>
      </div>

      {/* Popular With Your Network (drinks you share) */}
      {networkData.popularWithNetwork.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Popular in Your Circle
            </h4>
            {networkData.popularWithNetwork.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPopular(!showAllPopular)}
                className="text-xs"
              >
                {showAllPopular ? 'Show Less' : `+${networkData.popularWithNetwork.length - 4} more`}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {popularToShow.map((drink) => (
              <button
                key={`${drink.name}-${drink.type}`}
                onClick={() => handleDrinkClick(drink)}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/50 transition-transform group-hover:scale-105 group-active:scale-95 relative">
                  {drink.imageUrl ? (
                    <StorageImage
                      storagePath={drink.imageUrl}
                      alt={drink.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wine className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {drink.sharedByCount > 1 && (
                    <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 rounded font-medium">
                      +{drink.sharedByCount}
                    </div>
                  )}
                </div>
                <p className="text-xs text-center mt-1 line-clamp-1 text-muted-foreground group-hover:text-foreground">
                  {drink.name}
                </p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Drinks you share with others in your network
          </p>
        </div>
      )}

      {/* Discovery From Network */}
      {networkData.discoveryFromNetwork.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Discover from Your Network
            </h4>
            {networkData.discoveryFromNetwork.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllDiscovery(!showAllDiscovery)}
                className="text-xs"
              >
                {showAllDiscovery ? 'Show Less' : `+${networkData.discoveryFromNetwork.length - 4} more`}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {discoveryToShow.map((drink) => (
              <button
                key={`${drink.name}-${drink.type}`}
                onClick={() => handleDrinkClick(drink)}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-amber-500/20 transition-transform group-hover:scale-105 group-active:scale-95 relative">
                  {drink.imageUrl ? (
                    <StorageImage
                      storagePath={drink.imageUrl}
                      alt={drink.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wine className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {/* Show how many in network have this */}
                  {drink.sharedByCount > 0 && (
                    <div className="absolute bottom-1 left-1 flex -space-x-1">
                      {drink.sharedByUsers.slice(0, 2).map((u, i) => (
                        <Avatar key={i} className="h-4 w-4 border border-background">
                          {u.avatarUrl ? (
                            <AvatarImage src={u.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-[8px] bg-muted">
                              {u.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      ))}
                      {drink.sharedByCount > 2 && (
                        <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] text-muted-foreground">
                          +{drink.sharedByCount - 2}
                        </div>
                      )}
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
          <p className="text-xs text-muted-foreground text-center mt-2">
            {networkData.discoveryFromNetwork.length} drinks from your network you haven't tried
          </p>
        </div>
      )}

      {/* Empty comparison state */}
      {networkData.popularWithNetwork.length === 0 && networkData.discoveryFromNetwork.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wine className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No drinks to compare yet</p>
          <p className="text-xs mt-1">
            The people you follow haven't logged any drinks yet
          </p>
        </div>
      )}
    </div>
  );
}
