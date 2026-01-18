import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Follow, FollowCounts, PublicProfile } from '@/types/social';

export function useFollows(targetUserId?: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [followers, setFollowers] = useState<PublicProfile[]>([]);
  const [following, setFollowing] = useState<PublicProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkFollowStatus = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) {
      setIsFollowing(false);
      return;
    }

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .eq('status', 'accepted')
      .maybeSingle();

    setIsFollowing(!!data);
  }, [user, targetUserId]);

  const fetchFollowCounts = useCallback(async (userId: string) => {
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

    setFollowCounts({
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
    });
  }, []);

  const fetchFollowers = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)
      .eq('status', 'accepted');

    if (!data || data.length === 0) {
      setFollowers([]);
      return;
    }

    const followerIds = data.map(f => f.follower_id);
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('*')
      .in('user_id', followerIds);

    if (profiles) {
      setFollowers(profiles.map(p => ({
        userId: p.user_id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        isPublic: p.is_public || false,
        activityVisibility: (p.activity_visibility as 'private' | 'followers' | 'public') || 'private',
        createdAt: new Date(p.created_at || Date.now()),
      })));
    }
  }, []);

  const fetchFollowing = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted');

    if (!data || data.length === 0) {
      setFollowing([]);
      return;
    }

    const followingIds = data.map(f => f.following_id);
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('*')
      .in('user_id', followingIds);

    if (profiles) {
      setFollowing(profiles.map(p => ({
        userId: p.user_id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        isPublic: p.is_public || false,
        activityVisibility: (p.activity_visibility as 'private' | 'followers' | 'public') || 'private',
        createdAt: new Date(p.created_at || Date.now()),
      })));
    }
  }, []);

  const follow = async (userIdToFollow: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: userIdToFollow,
        status: 'accepted',
      });

    if (!error) {
      setIsFollowing(true);
      setFollowCounts(prev => ({ ...prev, following: prev.following + 1 }));
    }

    return { error };
  };

  const unfollow = async (userIdToUnfollow: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userIdToUnfollow);

    if (!error) {
      setIsFollowing(false);
      setFollowCounts(prev => ({ ...prev, following: prev.following - 1 }));
    }

    return { error };
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const userId = targetUserId || user?.id;
      
      if (userId) {
        await Promise.all([
          checkFollowStatus(),
          fetchFollowCounts(userId),
        ]);
      }
      setIsLoading(false);
    };

    loadData();
  }, [user, targetUserId, checkFollowStatus, fetchFollowCounts]);

  return {
    isFollowing,
    followCounts,
    followers,
    following,
    isLoading,
    follow,
    unfollow,
    fetchFollowers,
    fetchFollowing,
    refetch: () => {
      const userId = targetUserId || user?.id;
      if (userId) {
        checkFollowStatus();
        fetchFollowCounts(userId);
      }
    },
  };
}
