import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Drink, DrinkType, drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';

export interface ProfileStats {
  totalDrinks: number;
  wishlistCount: number;
  averageRating: number | null;
  favoriteType: { type: DrinkType; count: number; icon: string } | null;
  topRatedDrink: { name: string; rating: number } | null;
  memberSince: Date | null;
}

export interface TopDrink {
  id: string;
  name: string;
  type: DrinkType;
  rating: number;
  imageUrl: string | null;
  brand: string | null;
}

interface UseProfileStatsResult {
  stats: ProfileStats | null;
  topDrinks: TopDrink[];
  isLoading: boolean;
  error: string | null;
  canViewStats: boolean;
  refetch: () => Promise<void>;
}

export function useProfileStats(
  userId: string | undefined,
  isOwnProfile: boolean,
  canViewActivity: boolean,
  memberSince: Date | null
): UseProfileStatsResult {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [topDrinks, setTopDrinks] = useState<TopDrink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Can view stats if own profile or activity is visible
  const canViewStats = isOwnProfile || canViewActivity;

  const fetchStats = useCallback(async () => {
    if (!userId || !canViewStats) {
      setStats(null);
      setTopDrinks([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all drinks from the public view (respects privacy settings)
      const { data: allDrinks, error: drinksError } = await supabase
        .from('drinks_public')
        .select('id, name, type, rating, image_url, brand, is_wishlist')
        .eq('user_id', userId);

      if (drinksError) {
        console.error('Error fetching drinks:', drinksError);
        setError('Failed to load profile stats');
        setIsLoading(false);
        return;
      }

      // Separate logged drinks and wishlist
      const loggedDrinks = (allDrinks || []).filter(d => !d.is_wishlist);
      const wishlistCount = (allDrinks || []).filter(d => d.is_wishlist).length;

      // Calculate stats
      const totalDrinks = loggedDrinks.length;

      // Calculate average rating
      const ratedDrinks = loggedDrinks.filter(d => d.rating && d.rating > 0);
      const averageRating = ratedDrinks.length > 0
        ? ratedDrinks.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDrinks.length
        : null;

      // Find favorite type (most logged)
      const typeCounts: Record<string, number> = {};
      loggedDrinks.forEach(d => {
        typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      });
      
      let favoriteType: ProfileStats['favoriteType'] = null;
      if (Object.keys(typeCounts).length > 0) {
        const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        const typeIcon = isBuiltInDrinkType(topType[0]) 
          ? drinkTypeIcons[topType[0]] 
          : '🍹';
        favoriteType = { type: topType[0], count: topType[1], icon: typeIcon };
      }

      // Find top rated drink
      let topRatedDrink: ProfileStats['topRatedDrink'] = null;
      if (ratedDrinks.length > 0) {
        const topDrink = ratedDrinks.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
        topRatedDrink = { name: topDrink.name, rating: topDrink.rating || 0 };
      }

      setStats({
        totalDrinks,
        wishlistCount,
        averageRating,
        favoriteType,
        topRatedDrink,
        memberSince,
      });

      // Get top 6 drinks by rating
      const topDrinksData = ratedDrinks
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6)
        .map(d => ({
          id: d.id,
          name: d.name,
          type: d.type as DrinkType,
          rating: d.rating || 0,
          imageUrl: d.image_url,
          brand: d.brand,
        }));

      setTopDrinks(topDrinksData);
    } catch (err) {
      console.error('Error in fetchStats:', err);
      setError('Failed to load profile stats');
    } finally {
      setIsLoading(false);
    }
  }, [userId, canViewStats, memberSince]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    topDrinks,
    isLoading,
    error,
    canViewStats,
    refetch: fetchStats,
  };
}
