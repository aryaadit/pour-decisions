import { supabase } from '@/integrations/supabase/client';
import { AppNotification } from '@/types/social';
import { mapNotificationRow, mapPublicProfileRow } from '@/lib/mappers';
import { RealtimeChannel } from '@supabase/supabase-js';

const PAGE_SIZE = 20;

export async function fetchNotifications(
  userId: string,
  limit = PAGE_SIZE,
  cursor?: string
): Promise<{ notifications: AppNotification[]; nextCursor: string | null }> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) {
    return { notifications: [], nextCursor: null };
  }

  // Fetch actor profiles
  const actorIds = [...new Set(data.map((n) => n.actor_id))];
  const { data: profiles } = await supabase
    .from('profiles_public')
    .select('*')
    .in('user_id', actorIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, mapPublicProfileRow(p)])
  );

  const notifications = data.map((row) =>
    mapNotificationRow(row, profileMap.get(row.actor_id))
  );

  const nextCursor =
    data.length === limit ? data[data.length - 1].created_at : null;

  return { notifications, nextCursor };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: AppNotification) => void
): RealtimeChannel {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(mapNotificationRow(payload.new));
      }
    )
    .subscribe();
}
