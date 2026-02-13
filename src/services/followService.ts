import { supabase } from '@/integrations/supabase/client';
import { PublicProfile, FollowCounts } from '@/types/social';
import { mapPublicProfileRow } from '@/lib/mappers';

export async function checkFollowStatus(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .eq('status', 'accepted')
    .maybeSingle();

  return !!data;
}

export async function fetchFollowCounts(userId: string): Promise<FollowCounts> {
  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .eq('status', 'accepted'),
  ]);

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
  };
}

export async function fetchFollowers(userId: string): Promise<PublicProfile[]> {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .eq('status', 'accepted');

  if (!data || data.length === 0) return [];

  const followerIds = data.map((f) => f.follower_id);
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('*')
    .in('user_id', followerIds);

  return (profiles || []).map(mapPublicProfileRow);
}

export async function fetchFollowing(userId: string): Promise<PublicProfile[]> {
  const { data } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (!data || data.length === 0) return [];

  const followingIds = data.map((f) => f.following_id);
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('*')
    .in('user_id', followingIds);

  return (profiles || []).map(mapPublicProfileRow);
}

export async function followUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
    status: 'accepted',
  });

  if (error) throw error;
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}
