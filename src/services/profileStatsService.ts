import { supabase } from '@/integrations/supabase/client';
import { DrinkType, isBuiltInDrinkType, drinkTypeIcons } from '@/types/drink';
import { ProfileStats, TopDrink } from '@/hooks/useProfileStats';
import {
  TasteSignature,
  TasteBreakdownItem,
  CategoryTopDrinks,
  TopDrinkEntry,
  computePersonalityLabel,
} from '@/types/taste';

export interface ProfileStatsResult {
  stats: ProfileStats;
  topDrinks: TopDrink[];
  tasteSignature: TasteSignature;
  categoryTopDrinks: CategoryTopDrinks[];
}

interface DrinkRow {
  id: string;
  name: string;
  type: string;
  rating: number | null;
  image_url: string | null;
  brand: string | null;
}

export function computeTasteSignature(loggedDrinks: DrinkRow[]): TasteSignature {
  const total = loggedDrinks.length;
  if (total === 0) {
    return { breakdown: [], totalDrinks: 0, personalityLabel: 'Newcomer' };
  }

  const groups: Record<string, { count: number; ratingSum: number; ratedCount: number }> = {};
  for (const d of loggedDrinks) {
    if (!groups[d.type]) {
      groups[d.type] = { count: 0, ratingSum: 0, ratedCount: 0 };
    }
    groups[d.type].count++;
    if (d.rating && d.rating > 0) {
      groups[d.type].ratingSum += d.rating;
      groups[d.type].ratedCount++;
    }
  }

  const breakdown: TasteBreakdownItem[] = Object.entries(groups)
    .map(([type, g]) => ({
      type: type as DrinkType,
      count: g.count,
      percentage: Math.round((g.count / total) * 100),
      avgRating: g.ratedCount > 0 ? g.ratingSum / g.ratedCount : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    breakdown,
    totalDrinks: total,
    personalityLabel: computePersonalityLabel(breakdown),
  };
}

export function computeCategoryTopDrinks(loggedDrinks: DrinkRow[]): CategoryTopDrinks[] {
  const grouped: Record<string, DrinkRow[]> = {};
  for (const d of loggedDrinks) {
    if (!grouped[d.type]) grouped[d.type] = [];
    grouped[d.type].push(d);
  }

  return Object.entries(grouped)
    .map(([type, drinks]) => {
      const topDrinks: TopDrinkEntry[] = [...drinks]
        .filter((d) => d.rating && d.rating > 0)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3)
        .map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type as DrinkType,
          rating: d.rating || 0,
          imageUrl: d.image_url,
          brand: d.brand,
        }));

      return { type: type as DrinkType, topDrinks };
    })
    .filter((cat) => cat.topDrinks.length > 0)
    .sort((a, b) => b.topDrinks.length - a.topDrinks.length);
}

export async function fetchProfileStats(
  userId: string,
  memberSince: Date | null
): Promise<ProfileStatsResult> {
  const { data: allDrinks, error } = await supabase
    .from('drinks_public')
    .select('id, name, type, rating, image_url, brand')
    .eq('user_id', userId);

  if (error) throw error;

  const loggedDrinks = allDrinks || [];
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

  const tasteSignature = computeTasteSignature(loggedDrinks);
  const categoryTopDrinks = computeCategoryTopDrinks(loggedDrinks);

  return {
    stats: {
      totalDrinks,
      averageRating,
      favoriteType,
      topRatedDrink,
      memberSince,
    },
    topDrinks,
    tasteSignature,
    categoryTopDrinks,
  };
}
