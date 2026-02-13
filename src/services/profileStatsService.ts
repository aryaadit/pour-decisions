import { supabase } from '@/integrations/supabase/client';
import { DrinkType, isBuiltInDrinkType, drinkTypeIcons } from '@/types/drink';
import { ProfileStats, TopDrink } from '@/hooks/useProfileStats';

export interface ProfileStatsResult {
  stats: ProfileStats;
  topDrinks: TopDrink[];
}

export async function fetchProfileStats(
  userId: string,
  memberSince: Date | null
): Promise<ProfileStatsResult> {
  const { data: allDrinks, error } = await supabase
    .from('drinks_public')
    .select('id, name, type, rating, image_url, brand, is_wishlist')
    .eq('user_id', userId);

  if (error) throw error;

  const loggedDrinks = (allDrinks || []).filter((d) => !d.is_wishlist);
  const wishlistCount = (allDrinks || []).filter((d) => d.is_wishlist).length;
  const totalDrinks = loggedDrinks.length;

  const ratedDrinks = loggedDrinks.filter((d) => d.rating && d.rating > 0);
  const averageRating =
    ratedDrinks.length > 0
      ? ratedDrinks.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDrinks.length
      : null;

  const typeCounts: Record<string, number> = {};
  loggedDrinks.forEach((d) => {
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

  let topRatedDrink: ProfileStats['topRatedDrink'] = null;
  if (ratedDrinks.length > 0) {
    const topDrink = ratedDrinks.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    topRatedDrink = { name: topDrink.name, rating: topDrink.rating || 0 };
  }

  const topDrinks: TopDrink[] = [...ratedDrinks]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type as DrinkType,
      rating: d.rating || 0,
      imageUrl: d.image_url,
      brand: d.brand,
    }));

  return {
    stats: {
      totalDrinks,
      wishlistCount,
      averageRating,
      favoriteType,
      topRatedDrink,
      memberSince,
    },
    topDrinks,
  };
}
