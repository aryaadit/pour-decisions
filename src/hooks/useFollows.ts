import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { FollowCounts, FollowRelationship } from '@/types/social';
import { queryKeys } from '@/lib/queryKeys';
import * as followService from '@/services/followService';
import * as followRequestService from '@/services/followRequestService';

export function useFollows(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  // Relationship query — replaces old boolean isFollowing
  const { data: relationship = 'none' as FollowRelationship, isLoading: relationshipLoading } =
    useQuery({
      queryKey: queryKeys.follows.relationship(user?.id ?? '', targetUserId ?? ''),
      queryFn: () => followService.checkFollowRelationship(user!.id, targetUserId!),
      enabled: !!user && !!targetUserId && user.id !== targetUserId,
    });

  // Backward compat — keep isFollowing for existing consumers
  const isFollowing = relationship === 'following';
  const isRequested = relationship === 'requested';

  // Also keep the old status query key in sync for canViewActivity checks
  const { data: followStatusCheck = false, isLoading: statusLoading } = useQuery({
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

  const invalidateFollowQueries = (targetId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.follows.counts(targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.follows.counts(user!.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.follows.followers(targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.follows.following(user!.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.follows.status(user!.id, targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.follows.relationship(user!.id, targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.detail(targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.userActivities(targetId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.followRequests.all });
  };

  const followMutation = useMutation({
    mutationFn: (userIdToFollow: string) =>
      followService.followUser(user!.id, userIdToFollow),
    onSuccess: (result, userIdToFollow) => {
      queryClient.setQueryData(
        queryKeys.follows.relationship(user!.id, userIdToFollow),
        result === 'followed' ? 'following' : 'requested'
      );
      invalidateFollowQueries(userIdToFollow);
    },
    onError: (_, userIdToFollow) => {
      invalidateFollowQueries(userIdToFollow);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userIdToUnfollow: string) =>
      followService.unfollowUser(user!.id, userIdToUnfollow),
    onMutate: async (userIdToUnfollow) => {
      queryClient.setQueryData(
        queryKeys.follows.relationship(user!.id, userIdToUnfollow),
        'none'
      );
    },
    onSuccess: (_, userIdToUnfollow) => {
      invalidateFollowQueries(userIdToUnfollow);
    },
    onError: (_, userIdToUnfollow) => {
      invalidateFollowQueries(userIdToUnfollow);
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (targetId: string) =>
      followRequestService.cancelFollowRequest(user!.id, targetId),
    onMutate: async (targetId) => {
      queryClient.setQueryData(
        queryKeys.follows.relationship(user!.id, targetId),
        'none'
      );
    },
    onSuccess: (_, targetId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followRequests.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.relationship(user!.id, targetId),
      });
    },
    onError: (_, targetId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.relationship(user!.id, targetId),
      });
    },
  });

  const follow = async (userIdToFollow: string) => {
    if (!user) return { error: new Error('Not authenticated'), result: null };
    try {
      const result = await followMutation.mutateAsync(userIdToFollow);
      return { error: null, result };
    } catch (error) {
      return { error: error as Error, result: null };
    }
  };

  const unfollow = async (userIdToUnfollow: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      await unfollowMutation.mutateAsync(userIdToUnfollow);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const cancelRequest = async (targetId: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      await cancelRequestMutation.mutateAsync(targetId);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
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
    relationship,
    isFollowing,
    isRequested,
    followCounts,
    followers,
    following,
    isLoading: relationshipLoading || countsLoading,
    isMutating: followMutation.isPending || unfollowMutation.isPending || cancelRequestMutation.isPending,
    follow,
    unfollow,
    cancelRequest,
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
          queryKey: queryKeys.follows.relationship(user.id, targetUserId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.follows.status(user.id, targetUserId),
        });
      }
    },
  };
}
