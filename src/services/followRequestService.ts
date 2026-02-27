import { supabase } from '@/integrations/supabase/client';
import { FollowRequest, FollowRequestStatus } from '@/types/social';
import { mapFollowRequestRow, mapPublicProfileRow } from '@/lib/mappers';

export async function sendFollowRequest(
  requesterId: string,
  targetId: string
): Promise<void> {
  // Remove any stale follow request (accepted/rejected) before inserting
  // to avoid UNIQUE constraint violation on (requester_id, target_id)
  await supabase
    .from('follow_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('target_id', targetId)
    .neq('status', 'pending');

  const { error } = await supabase.from('follow_requests').insert({
    requester_id: requesterId,
    target_id: targetId,
    status: 'pending',
  });

  if (error) throw error;
}

export async function cancelFollowRequest(
  requesterId: string,
  targetId: string
): Promise<void> {
  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('target_id', targetId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function acceptFollowRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('follow_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function rejectFollowRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('follow_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function fetchPendingRequests(userId: string): Promise<FollowRequest[]> {
  const { data, error } = await supabase
    .from('follow_requests')
    .select('*')
    .eq('target_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch requester profiles
  const requesterIds = data.map((r) => r.requester_id);
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('*')
    .in('user_id', requesterIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, mapPublicProfileRow(p)])
  );

  return data.map((row) => mapFollowRequestRow(row, profileMap.get(row.requester_id)));
}

export async function fetchOutgoingRequests(userId: string): Promise<FollowRequest[]> {
  const { data, error } = await supabase
    .from('follow_requests')
    .select('*')
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => mapFollowRequestRow(row));
}

export async function checkFollowRequestStatus(
  requesterId: string,
  targetId: string
): Promise<FollowRequestStatus | 'none'> {
  const { data } = await supabase
    .from('follow_requests')
    .select('status')
    .eq('requester_id', requesterId)
    .eq('target_id', targetId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!data) return 'none';
  return data.status as FollowRequestStatus;
}
