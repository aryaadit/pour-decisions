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
  let query = supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

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
    .select('*')
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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!data) return [];

  return data.map((item) => mapActivityFeedItem(item));
}

export function subscribeToFeed(
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
