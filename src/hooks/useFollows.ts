import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { FollowCounts, PublicProfile } from '@/types/social';
import { queryKeys } from '@/lib/queryKeys';
import * as followService from '@/services/followService';

export function useFollows(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  const { data: isFollowing = false, isLoading: statusLoading } = useQuery({
    queryKey: queryKeys.follows.status(user?.id ?? '', targetUserId ?? ''),
    queryFn: () => followService.checkFollowStatus(user!.id, targetUserId!),
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });

  const { data: followCounts = { followers: 0, following: 0 }, isLoading: countsLoading } =
    useQuery({
      queryKey: queryKeys.follows.counts(userId ?? ''),
      queryFn: () => followService.fetchFollowCounts(userId!),
      enabled: !!userId,
    });

  const { data: followers = [] } = useQuery({
    queryKey: queryKeys.follows.followers(userId ?? ''),
    queryFn: () => followService.fetchFollowers(userId!),
    enabled: false, // Only fetch on demand
  });

  const { data: following = [] } = useQuery({
    queryKey: queryKeys.follows.following(userId ?? ''),
    queryFn: () => followService.fetchFollowing(userId!),
    enabled: false, // Only fetch on demand
  });

  const followMutation = useMutation({
    mutationFn: (userIdToFollow: string) =>
      followService.followUser(user!.id, userIdToFollow),
    onMutate: async (userIdToFollow) => {
      // Optimistic update for follow status
      queryClient.setQueryData(
        queryKeys.follows.status(user!.id, userIdToFollow),
        true
      );
      // Optimistic update for counts of the target user
      queryClient.setQueryData<FollowCounts>(
        queryKeys.follows.counts(userIdToFollow),
        (old) =>
          old
            ? { ...old, followers: old.followers + 1 }
            : { followers: 1, following: 0 }
      );
    },
    onSuccess: (_, userIdToFollow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.followers(userIdToFollow) });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.following(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.counts(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.detail(userIdToFollow) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.userActivities(userIdToFollow) });
    },
    onError: (_, userIdToFollow) => {
      queryClient.setQueryData(
        queryKeys.follows.status(user!.id, userIdToFollow),
        false
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.counts(userIdToFollow),
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userIdToUnfollow: string) =>
      followService.unfollowUser(user!.id, userIdToUnfollow),
    onMutate: async (userIdToUnfollow) => {
      queryClient.setQueryData(
        queryKeys.follows.status(user!.id, userIdToUnfollow),
        false
      );
      queryClient.setQueryData<FollowCounts>(
        queryKeys.follows.counts(userIdToUnfollow),
        (old) =>
          old
            ? { ...old, followers: Math.max(0, old.followers - 1) }
            : { followers: 0, following: 0 }
      );
    },
    onSuccess: (_, userIdToUnfollow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.followers(userIdToUnfollow) });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.following(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.counts(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.detail(userIdToUnfollow) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.userActivities(userIdToUnfollow) });
    },
    onError: (_, userIdToUnfollow) => {
      queryClient.setQueryData(
        queryKeys.follows.status(user!.id, userIdToUnfollow),
        true
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.counts(userIdToUnfollow),
      });
    },
  });

  const follow = async (userIdToFollow: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      await followMutation.mutateAsync(userIdToFollow);
      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  const unfollow = async (userIdToUnfollow: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      await unfollowMutation.mutateAsync(userIdToUnfollow);
      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error('Unknown error') };
    }
  };

  const fetchFollowers = async (id: string) => {
    await queryClient.fetchQuery({
      queryKey: queryKeys.follows.followers(id),
      queryFn: () => followService.fetchFollowers(id),
    });
  };

  const fetchFollowing = async (id: string) => {
    await queryClient.fetchQuery({
      queryKey: queryKeys.follows.following(id),
      queryFn: () => followService.fetchFollowing(id),
    });
  };

  return {
    isFollowing,
    followCounts,
    followers,
    following,
    isLoading: statusLoading || countsLoading,
    follow,
    unfollow,
    fetchFollowers,
    fetchFollowing,
    refetch: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.follows.counts(userId),
        });
      }
      if (user && targetUserId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.follows.status(user.id, targetUserId),
        });
      }
    },
  };
}
