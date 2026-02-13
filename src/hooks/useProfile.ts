import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { Profile, SortOrder, ThemePreference, OnboardingStep } from '@/types/profile';
import { DrinkType } from '@/types/drink';
import { ActivityVisibility } from '@/types/social';
import { queryKeys } from '@/lib/queryKeys';
import * as profileService from '@/services/profileService';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading } = useQuery({
    queryKey: queryKeys.profile.detail(user?.id ?? ''),
    queryFn: () => profileService.fetchProfile(user!.id),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<{
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
    }>) => profileService.updateProfile(user!.id, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.detail(user!.id) });
      const previous = queryClient.getQueryData<Profile | null>(
        queryKeys.profile.detail(user!.id)
      );
      queryClient.setQueryData<Profile | null>(
        queryKeys.profile.detail(user!.id),
        (old) => (old ? { ...old, ...updates } : null)
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          queryKeys.profile.detail(user!.id),
          context.previous
        );
      }
    },
  });

  const updateProfile = async (updates: Parameters<typeof updateMutation.mutateAsync>[0]) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      await updateMutation.mutateAsync(updates);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error('Not authenticated'), url: null };

    try {
      const storagePath = await profileService.uploadAvatar(user.id, file);
      await updateProfile({ avatarUrl: storagePath });
      return { error: null, url: storagePath };
    } catch (error) {
      return { error: error as Error, url: null };
    }
  };

  return {
    profile,
    isLoading,
    updateProfile,
    uploadAvatar,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.detail(user?.id ?? ''),
      }),
  };
}
