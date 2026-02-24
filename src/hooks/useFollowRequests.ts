import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import * as followRequestService from '@/services/followRequestService';

export function useFollowRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: queryKeys.followRequests.pending(user?.id ?? ''),
    queryFn: () => followRequestService.fetchPendingRequests(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: outgoingRequests = [], isLoading: outgoingLoading } = useQuery({
    queryKey: queryKeys.followRequests.outgoing(user?.id ?? ''),
    queryFn: () => followRequestService.fetchOutgoingRequests(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) =>
      followRequestService.acceptFollowRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.follows.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      followRequestService.rejectFollowRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  return {
    pendingRequests,
    outgoingRequests,
    pendingCount: pendingRequests.length,
    isLoading: pendingLoading || outgoingLoading,
    accept: (requestId: string) => acceptMutation.mutateAsync(requestId),
    reject: (requestId: string) => rejectMutation.mutateAsync(requestId),
    isAccepting: acceptMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
