import { supabase } from '@/integrations/supabase/client';
import { ActivityFeedItem, PublicProfile } from '@/types/social';
import { mapPublicProfileRow, mapActivityFeedItem } from '@/lib/mappers';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface FeedPage {
  items: ActivityFeedItem[];
  cursor: string | null;
  hasMore: boolean;
}

export async function fetchFeedPage(
  limit: number,
  cursor?: string
): Promise<FeedPage> {
  // Get current user to exclude own activity from the feed
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  let query = supabase
    .from('activity_feed')
    .select('id, user_id, activity_type, drink_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  // Exclude own activity — feed shows other people's activity
  if (currentUserId) {
    query = query.neq('user_id', currentUserId);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) {
    return { items: [], cursor: null, hasMore: false };
  }

  const hasMore = data.length > limit;
  const feedItems = hasMore ? data.slice(0, limit) : data;

  // Get unique user IDs to fetch profiles
  const userIds = [...new Set(feedItems.map((item) => item.user_id))];
  const profileMap = await fetchProfilesForActivities(userIds);

  const items = feedItems.map((item) =>
    mapActivityFeedItem(item, profileMap.get(item.user_id))
  );

  const lastItem = items[items.length - 1];
  return {
    items,
    cursor: lastItem ? lastItem.createdAt.toISOString() : null,
    hasMore,
  };
}

export async function fetchProfilesForActivities(
  userIds: string[]
): Promise<Map<string, PublicProfile>> {
  const profileMap = new Map<string, PublicProfile>();
  if (userIds.length === 0) return profileMap;

  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('user_id, username, display_name, avatar_url, bio, is_public, activity_visibility, created_at')
    .in('user_id', userIds);

  if (profiles) {
    profiles.forEach((p) => {
      profileMap.set(p.user_id, mapPublicProfileRow(p));
    });
  }

  return profileMap;
}

export async function fetchUserActivities(
  userId: string,
  limit = 20
): Promise<ActivityFeedItem[]> {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('id, user_id, activity_type, drink_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return data.map((item) => mapActivityFeedItem(item));
}

export function subscribeToFeed(
  currentUserId: string,
  onInsert: (item: any) => void
): { unsubscribe: () => void } {
  const channel: RealtimeChannel = supabase
    .channel('activity_feed_realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
      },
      (payload) => {
        // Skip own activity in the feed
        if (payload.new.user_id === currentUserId) return;
        onInsert(payload.new);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
