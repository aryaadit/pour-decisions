import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import * as discoveryService from '@/services/discoveryService';
import { PopularDrink } from '@/services/discoveryService';
import { SuggestedUser } from '@/types/social';

export function useDiscovery() {
  const { user } = useAuth();

  const {
    data: circlePopular = [],
    isLoading: circleLoading,
  } = useQuery({
    queryKey: queryKeys.discovery.circle(user?.id ?? ''),
    queryFn: () => discoveryService.fetchCirclePopular(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const {
    data: trending = [],
    isLoading: trendingLoading,
  } = useQuery({
    queryKey: queryKeys.discovery.trending(),
    queryFn: () => discoveryService.fetchGlobalTrending(),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const {
    data: suggestedUsers = [],
    isLoading: suggestedLoading,
  } = useQuery({
    queryKey: queryKeys.discovery.suggested(user?.id ?? ''),
    queryFn: () => discoveryService.fetchSuggestedUsers(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return {
    circlePopular,
    trending,
    suggestedUsers,
    isLoading: circleLoading || trendingLoading,
    suggestedLoading,
  };
}

export type { PopularDrink, SuggestedUser };
