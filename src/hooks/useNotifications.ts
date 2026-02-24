import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import * as notificationService from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notificationsChannelRef = useRef<RealtimeChannel | null>(null);
  const followsChannelRef = useRef<RealtimeChannel | null>(null);
  const myFollowsChannelRef = useRef<RealtimeChannel | null>(null);

  // Unread count — Realtime-driven, stale time as fallback
  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(user?.id ?? ''),
    queryFn: () => notificationService.getUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // Paginated notification list
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(user?.id ?? ''),
    queryFn: ({ pageParam }) =>
      notificationService.fetchNotifications(user!.id, 20, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  // Realtime: notifications subscription
  useEffect(() => {
    if (!user) return;

    notificationsChannelRef.current = notificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        // Increment unread count optimistically
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(user.id),
          (old) => (old ?? 0) + 1
        );
        // Invalidate the list so it refreshes on next view
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.list(user.id),
        });

        // When a follow request is accepted, immediately update follow state
        if (notification.type === 'follow_accepted') {
          const targetId = notification.actorId;
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.relationship(user.id, targetId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.status(user.id, targetId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.counts(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.following(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.followRequests.all,
          });
        }
      }
    );

    return () => {
      notificationsChannelRef.current?.unsubscribe();
      notificationsChannelRef.current = null;
    };
  }, [user, queryClient]);

  // Realtime: follows subscription — update follower count when someone follows/unfollows
  useEffect(() => {
    if (!user) return;

    followsChannelRef.current = supabase
      .channel(`follows:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.counts(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.followers(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.profileStats.detail(user.id),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.counts(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.followers(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.profileStats.detail(user.id),
          });
        }
      )
      .subscribe();

    return () => {
      followsChannelRef.current?.unsubscribe();
      followsChannelRef.current = null;
    };
  }, [user, queryClient]);

  // Realtime: my follows subscription — detect when follow requests are accepted
  // (DB trigger inserts a follow row with follower_id = current user)
  useEffect(() => {
    if (!user) return;

    myFollowsChannelRef.current = supabase
      .channel(`my-follows:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.counts(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.following(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.followRequests.all,
          });
          // Invalidate all relationship/status queries for current user
          queryClient.invalidateQueries({
            queryKey: ['follows', 'relationship'],
          });
          queryClient.invalidateQueries({
            queryKey: ['follows', 'status'],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.counts(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.follows.following(user.id),
          });
          queryClient.invalidateQueries({
            queryKey: ['follows', 'relationship'],
          });
          queryClient.invalidateQueries({
            queryKey: ['follows', 'status'],
          });
        }
      )
      .subscribe();

    return () => {
      myFollowsChannelRef.current?.unsubscribe();
      myFollowsChannelRef.current = null;
    };
  }, [user, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(user?.id ?? ''),
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.setQueryData<number>(
        queryKeys.notifications.unreadCount(user!.id),
        0
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.list(user!.id),
      });
    },
  });

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore: !!hasNextPage,
    loadMore,
    markAsRead: (id: string) => markAsReadMutation.mutateAsync(id),
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    refetch,
  };
}
