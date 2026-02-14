import { supabase } from '@/integrations/supabase/client';

export interface PopularDrink {
  name: string;
  type: string;
  logCount: number;
  avgRating: number | null;
  sampleImage: string | null;
}

export async function fetchCirclePopular(
  userId: string,
  limit = 10
): Promise<PopularDrink[]> {
  // Get IDs of users this person follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (!follows || follows.length === 0) return [];

  const followingIds = follows.map((f) => f.following_id);

  // Get drinks logged by followed users in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: activities, error } = await supabase
    .from('activity_feed')
    .select('metadata')
    .in('user_id', followingIds)
    .eq('activity_type', 'drink_added')
    .gte('created_at', sevenDaysAgo);

  if (error) throw error;
  if (!activities || activities.length === 0) return [];

  // Group by drink name and aggregate
  const groups: Record<
    string,
    { name: string; type: string; count: number; ratingSum: number; ratedCount: number; image: string | null }
  > = {};

  for (const a of activities) {
    const meta = a.metadata as Record<string, any>;
    const name = meta?.name;
    if (!name) continue;

    const key = name.toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        name,
        type: meta.type || 'other',
        count: 0,
        ratingSum: 0,
        ratedCount: 0,
        image: meta.image_url || null,
      };
    }
    groups[key].count++;
    if (meta.rating && meta.rating > 0) {
      groups[key].ratingSum += meta.rating;
      groups[key].ratedCount++;
    }
    if (meta.image_url && !groups[key].image) {
      groups[key].image = meta.image_url;
    }
  }

  return Object.values(groups)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g) => ({
      name: g.name,
      type: g.type,
      logCount: g.count,
      avgRating: g.ratedCount > 0 ? g.ratingSum / g.ratedCount : null,
      sampleImage: g.image,
    }));
}

export async function fetchGlobalTrending(limit = 10): Promise<PopularDrink[]> {
  const { data, error } = await supabase.rpc('get_trending_drinks', {
    days: 7,
    lim: limit,
  });

  if (error) {
    // RPC might not exist yet if migration hasn't been applied
    console.warn('Trending RPC not available:', error.message);
    return [];
  }

  if (!data) return [];

  return (data as any[]).map((row) => ({
    name: row.drink_name,
    type: row.drink_type || 'other',
    logCount: Number(row.log_count),
    avgRating: row.avg_rating ? Number(row.avg_rating) : null,
    sampleImage: row.sample_image || null,
  }));
}
