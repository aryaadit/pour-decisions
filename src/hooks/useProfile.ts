import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Profile, SortOrder, ThemePreference, OnboardingStep } from '@/types/profile';
import { DrinkType } from '@/types/drink';
import { ActivityVisibility } from '@/types/social';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          defaultDrinkType: data.default_drink_type as DrinkType | null,
          defaultSortOrder: (data.default_sort_order as SortOrder) || 'date_desc',
          themePreference: (data.theme_preference as ThemePreference) || 'system',
          username: data.username,
          bio: data.bio,
          isPublic: data.is_public || false,
          activityVisibility: (data.activity_visibility as ActivityVisibility) || 'private',
          hasSeenWelcome: data.has_seen_welcome || false,
          onboardingStep: (data.onboarding_step as OnboardingStep) || 'welcome',
          dismissedOnboardingSteps: (data.dismissed_onboarding_steps as OnboardingStep[]) || [],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<{
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
  }>) => {
    if (!user) return { error: new Error('Not authenticated') };

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
    if ('dismissedOnboardingSteps' in updates) dbUpdates.dismissed_onboarding_steps = updates.dismissedOnboardingSteps;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error('Not authenticated'), url: null };

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) return { error: uploadError, url: null };

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await updateProfile({ avatarUrl: publicUrl });

    return { error: null, url: publicUrl };
  };

  return {
    profile,
    isLoading,
    updateProfile,
    uploadAvatar,
    refetch: fetchProfile,
  };
}
