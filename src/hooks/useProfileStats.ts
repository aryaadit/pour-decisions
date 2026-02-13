import { useQuery } from '@tanstack/react-query';
import { DrinkType } from '@/types/drink';
import { queryKeys } from '@/lib/queryKeys';
import * as profileStatsService from '@/services/profileStatsService';

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
  refetch: () => void;
}

export function useProfileStats(
  userId: string | undefined,
  isOwnProfile: boolean,
  canViewActivity: boolean,
  memberSince: Date | null
): UseProfileStatsResult {
  const canViewStats = isOwnProfile || canViewActivity;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.profileStats.detail(userId ?? ''),
    queryFn: () => profileStatsService.fetchProfileStats(userId!, memberSince),
    enabled: !!userId && canViewStats,
  });

  return {
    stats: data?.stats ?? null,
    topDrinks: data?.topDrinks ?? [],
    isLoading,
    error: error ? 'Failed to load profile stats' : null,
    canViewStats,
    refetch,
  };
}
