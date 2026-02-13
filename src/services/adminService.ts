import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  image_url: string | null;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  has_seen_welcome: boolean;
  onboarding_step: string;
  dismissed_onboarding_steps: string[];
}

export async function fetchBugReports(): Promise<BugReport[]> {
  const { data, error } = await supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as BugReport[];
}

export async function updateBugReportStatus(
  id: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from('bug_reports')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteBugReport(id: string): Promise<void> {
  const { error } = await supabase
    .from('bug_reports')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function searchProfiles(
  query: string
): Promise<AdminUserProfile[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, user_id, username, display_name, avatar_url, has_seen_welcome, onboarding_step, dismissed_onboarding_steps'
    )
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return (data as AdminUserProfile[]) || [];
}

export async function updateUserOnboarding(
  userId: string,
  updates: Partial<
    Pick<
      AdminUserProfile,
      'has_seen_welcome' | 'onboarding_step' | 'dismissed_onboarding_steps'
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function fetchAnalyticsEvents(
  daysBack: number,
  limit = 1000
) {
  const startDate = subDays(new Date(), daysBack).toISOString();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .gte('created_at', startDate)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function insertBugReport(
  userId: string,
  title: string,
  description: string,
  category: string,
  imageUrl: string | null
): Promise<void> {
  const { error } = await supabase.from('bug_reports').insert({
    user_id: userId,
    title,
    description,
    category,
    image_url: imageUrl,
  });

  if (error) throw error;
}
