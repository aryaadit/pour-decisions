import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PublicProfile, ActivityVisibility } from '@/types/social';

export function useSocialProfile() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const getProfileByUsername = useCallback(async (username: string): Promise<PublicProfile | null> => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .ilike('username', username)
      .maybeSingle();

    setIsLoading(false);

    if (error || !data) return null;

    return {
      userId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      isPublic: data.is_public || false,
      activityVisibility: (data.activity_visibility as ActivityVisibility) || 'private',
      createdAt: new Date(data.created_at || Date.now()),
    };
  }, []);

  const getProfileByUserId = useCallback(async (userId: string): Promise<PublicProfile | null> => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    setIsLoading(false);

    if (error || !data) return null;

    return {
      userId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      isPublic: data.is_public || false,
      activityVisibility: (data.activity_visibility as ActivityVisibility) || 'private',
      createdAt: new Date(data.created_at || Date.now()),
    };
  }, []);

  const searchUsers = useCallback(async (query: string, limit = 10): Promise<PublicProfile[]> => {
    if (!query || query.length < 2) return [];

    setIsLoading(true);

    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .eq('is_public', true)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    setIsLoading(false);

    if (error || !data) return [];

    return data
      .filter(p => p.user_id !== user?.id) // Exclude current user
      .map(p => ({
        userId: p.user_id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        isPublic: p.is_public || false,
        activityVisibility: (p.activity_visibility as ActivityVisibility) || 'private',
        createdAt: new Date(p.created_at || Date.now()),
      }));
  }, [user]);

  const checkUsernameAvailable = useCallback(async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) return false;

    const { data } = await supabase
      .from('profiles_public')
      .select('user_id')
      .ilike('username', username)
      .maybeSingle();

    // If data exists and it's not the current user, username is taken
    if (data && data.user_id !== user?.id) return false;
    
    return true;
  }, [user]);

  const updateSocialProfile = useCallback(async (updates: {
    username?: string;
    bio?: string;
    isPublic?: boolean;
    activityVisibility?: ActivityVisibility;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        bio: updates.bio,
        is_public: updates.isPublic,
        activity_visibility: updates.activityVisibility,
      })
      .eq('user_id', user.id);

    return { error };
  }, [user]);

  return {
    isLoading,
    getProfileByUsername,
    getProfileByUserId,
    searchUsers,
    checkUsernameAvailable,
    updateSocialProfile,
  };
}
