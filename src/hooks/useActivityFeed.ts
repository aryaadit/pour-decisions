import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ActivityFeedItem } from '@/types/social';
import { queryKeys } from '@/lib/queryKeys';
import { mapPublicProfileRow, mapActivityFeedItem } from '@/lib/mappers';
import * as feedService from '@/services/feedService';
import { supabase } from '@/integrations/supabase/client';

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

    const subscription = feedService.subscribeToFeed(async (newActivity) => {
      // Fetch profile for this user
      const { data: profile } = await supabase
        .from('profiles_public')
        .select('*')
        .eq('user_id', newActivity.user_id)
        .single();

      const userProfile = profile ? mapPublicProfileRow(profile) : undefined;
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
