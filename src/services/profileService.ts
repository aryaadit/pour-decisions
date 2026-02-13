import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { PublicProfile, ActivityVisibility } from '@/types/social';
import { DrinkType } from '@/types/drink';
import { SortOrder, ThemePreference, OnboardingStep } from '@/types/profile';
import { mapProfileRow, mapPublicProfileRow } from '@/lib/mappers';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<{
    displayName: string | null;
    avatarUrl: string | null;
    defaultDrinkType: DrinkType | null;
    defaultSortOrder: SortOrder;
    themePreference: ThemePreference;
    username: string | null;
    bio: string | null;
    isPublic: boolean;
    activityVisibility: ActivityVisibility;
    hasSeenWelcome: boolean;
    onboardingStep: OnboardingStep;
    dismissedOnboardingSteps: OnboardingStep[];
  }>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if ('displayName' in updates) dbUpdates.display_name = updates.displayName;
  if ('avatarUrl' in updates) dbUpdates.avatar_url = updates.avatarUrl;
  if ('defaultDrinkType' in updates) dbUpdates.default_drink_type = updates.defaultDrinkType;
  if ('defaultSortOrder' in updates) dbUpdates.default_sort_order = updates.defaultSortOrder;
  if ('themePreference' in updates) dbUpdates.theme_preference = updates.themePreference;
  if ('username' in updates) dbUpdates.username = updates.username;
  if ('bio' in updates) dbUpdates.bio = updates.bio;
  if ('isPublic' in updates) dbUpdates.is_public = updates.isPublic;
  if ('activityVisibility' in updates) dbUpdates.activity_visibility = updates.activityVisibility;
  if ('hasSeenWelcome' in updates) dbUpdates.has_seen_welcome = updates.hasSeenWelcome;
  if ('onboardingStep' in updates) dbUpdates.onboarding_step = updates.onboardingStep;
  if ('dismissedOnboardingSteps' in updates)
    dbUpdates.dismissed_onboarding_steps = updates.dismissedOnboardingSteps;

  const { error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;
  return `avatars/${filePath}`;
}

export async function fetchProfileByUsername(
  username: string
): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles_public')
    .select('user_id, username, display_name, avatar_url, bio, is_public, activity_visibility, created_at')
    .ilike('username', username)
    .maybeSingle();

  if (error || !data) return null;
  return mapPublicProfileRow(data);
}

export async function fetchProfileByUserId(
  userId: string
): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles_public')
    .select('user_id, username, display_name, avatar_url, bio, is_public, activity_visibility, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapPublicProfileRow(data);
}

export async function searchUsers(
  query: string,
  limit = 10,
  excludeUserId?: string
): Promise<PublicProfile[]> {
  if (!query || query.length < 2) return [];

  const searchFilter = `username.ilike.%${query}%,display_name.ilike.%${query}%`;

  const { data, error } = await supabase
    .from('profiles_public')
    .select('user_id, username, display_name, avatar_url, bio, is_public, activity_visibility, created_at')
    .eq('is_public', true)
    .or(searchFilter)
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((p) => p.user_id !== excludeUserId)
    .map(mapPublicProfileRow);
}

export async function checkUsernameAvailable(
  username: string,
  currentUserId?: string
): Promise<boolean> {
  if (!username || username.length < 3) return false;

  const { data } = await supabase
    .from('profiles_public')
    .select('user_id')
    .ilike('username', username)
    .maybeSingle();

  if (data && data.user_id !== currentUserId) return false;
  return true;
}

export async function updateSocialProfile(
  userId: string,
  updates: {
    username?: string;
    bio?: string;
    isPublic?: boolean;
    activityVisibility?: ActivityVisibility;
  }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      username: updates.username,
      bio: updates.bio,
      is_public: updates.isPublic,
      activity_visibility: updates.activityVisibility,
    })
    .eq('user_id', userId);

  if (error) throw error;
}
