import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ActivityFeedItem, PublicProfile } from '@/types/social';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useActivityFeed(limit = 20) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (cursor?: string) => {
    if (!user) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let query = supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activity feed:', error);
      setIsLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      if (!cursor) setActivities([]);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    // Check if there are more results
    const hasMoreResults = data.length > limit;
    const feedItems = hasMoreResults ? data.slice(0, limit) : data;
    setHasMore(hasMoreResults);

    // Get unique user IDs to fetch profiles
    const userIds = [...new Set(feedItems.map(item => item.user_id))];
    
    // Fetch profiles for all users
    const { data: profiles } = await supabase
      .from('profiles_public')
      .select('*')
      .in('user_id', userIds);

    const profileMap = new Map<string, PublicProfile>();
    if (profiles) {
      profiles.forEach(p => {
        profileMap.set(p.user_id, {
          userId: p.user_id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          bio: p.bio,
          isPublic: p.is_public || false,
          activityVisibility: (p.activity_visibility as 'private' | 'followers' | 'public') || 'private',
          createdAt: new Date(p.created_at || Date.now()),
        });
      });
    }

    const mappedActivities: ActivityFeedItem[] = feedItems.map(item => ({
      id: item.id,
      userId: item.user_id,
      activityType: item.activity_type as 'drink_added' | 'drink_rated' | 'wishlist_added',
      drinkId: item.drink_id,
      metadata: item.metadata as ActivityFeedItem['metadata'],
      createdAt: new Date(item.created_at),
      user: profileMap.get(item.user_id),
    }));

    if (cursor) {
      setActivities(prev => [...prev, ...mappedActivities]);
    } else {
      setActivities(mappedActivities);
    }

    setIsLoading(false);
  }, [user, limit]);

  const loadMore = useCallback(() => {
    if (activities.length > 0 && hasMore && !isLoading) {
      const lastActivity = activities[activities.length - 1];
      fetchFeed(lastActivity.createdAt.toISOString());
    }
  }, [activities, hasMore, isLoading, fetchFeed]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Real-time subscription for new activities
  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = supabase
      .channel('activity_feed_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        async (payload) => {
          const newActivity = payload.new as any;
          
          // Fetch the profile for this user
          const { data: profile } = await supabase
            .from('profiles_public')
            .select('*')
            .eq('user_id', newActivity.user_id)
            .single();

          const userProfile: PublicProfile | undefined = profile ? {
            userId: profile.user_id,
            username: profile.username,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            bio: profile.bio,
            isPublic: profile.is_public || false,
            activityVisibility: (profile.activity_visibility as 'private' | 'followers' | 'public') || 'private',
            createdAt: new Date(profile.created_at || Date.now()),
          } : undefined;

          const mappedActivity: ActivityFeedItem = {
            id: newActivity.id,
            userId: newActivity.user_id,
            activityType: newActivity.activity_type as 'drink_added' | 'drink_rated' | 'wishlist_added',
            drinkId: newActivity.drink_id,
            metadata: newActivity.metadata as ActivityFeedItem['metadata'],
            createdAt: new Date(newActivity.created_at),
            user: userProfile,
          };

          // Add to the beginning of the list
          setActivities(prev => [mappedActivity, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    activities,
    isLoading,
    hasMore,
    loadMore,
    refetch: () => fetchFeed(),
  };
}
