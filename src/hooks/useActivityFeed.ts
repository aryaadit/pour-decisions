import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ActivityFeedItem } from '@/types/social';
import { queryKeys } from '@/lib/queryKeys';
import { mapActivityFeedItem } from '@/lib/mappers';
import * as feedService from '@/services/feedService';

export function useActivityFeed(limit = 20) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed.list(),
    queryFn: ({ pageParam }) =>
      feedService.fetchFeedPage(limit, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!user,
  });

  const activities = data?.pages.flatMap((p) => p.items) ?? [];
  const hasMore = hasNextPage ?? false;

  const loadMore = () => {
    if (hasMore && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = feedService.subscribeToFeed(user.id, async (newActivity) => {
      // Batch-fetch profile (reuses existing helper)
      const profileMap = await feedService.fetchProfilesForActivities([newActivity.user_id]);
      const userProfile = profileMap.get(newActivity.user_id);
      const mappedActivity = mapActivityFeedItem(newActivity, userProfile);

      // Prepend to first page
      queryClient.setQueryData(queryKeys.feed.list(), (old: any) => {
        if (!old?.pages?.length) return old;
        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          items: [mappedActivity, ...newPages[0].items],
        };
        return { ...old, pages: newPages };
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, queryClient]);

  return {
    activities,
    isLoading,
    hasMore,
    loadMore,
    refetch: () => refetch(),
  };
}
