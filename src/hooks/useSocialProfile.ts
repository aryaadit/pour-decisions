import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PublicProfile, ActivityVisibility } from '@/types/social';
import * as profileService from '@/services/profileService';

export function useSocialProfile() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const getProfileByUsername = useCallback(
    async (username: string): Promise<PublicProfile | null> => {
      setIsLoading(true);
      try {
        return await profileService.fetchProfileByUsername(username);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getProfileByUserId = useCallback(
    async (userId: string): Promise<PublicProfile | null> => {
      setIsLoading(true);
      try {
        return await profileService.fetchProfileByUserId(userId);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const searchUsers = useCallback(
    async (
      query: string,
      limit = 10,
      currentUserId?: string
    ): Promise<PublicProfile[]> => {
      if (!query || query.length < 2) return [];
      setIsLoading(true);
      try {
        const excludeId = currentUserId || user?.id;
        return await profileService.searchUsers(query, limit, excludeId);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const checkUsernameAvailable = useCallback(
    async (username: string): Promise<boolean> => {
      return profileService.checkUsernameAvailable(username, user?.id);
    },
    [user]
  );

  const updateSocialProfile = useCallback(
    async (updates: {
      username?: string;
      bio?: string;
      isPublic?: boolean;
      activityVisibility?: ActivityVisibility;
    }) => {
      if (!user) return { error: new Error('Not authenticated') };
      try {
        await profileService.updateSocialProfile(user.id, updates);
        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [user]
  );

  return {
    isLoading,
    getProfileByUsername,
    getProfileByUserId,
    searchUsers,
    checkUsernameAvailable,
    updateSocialProfile,
  };
}
