import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Collection, Drink, DrinkType } from '@/types/drink';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { queryKeys } from '@/lib/queryKeys';
import * as collectionService from '@/services/collectionService';

export function useCollections() {
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: queryKeys.collections.list(user?.id ?? ''),
    queryFn: () => collectionService.fetchCollections(user!.id),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: ({
      name,
      description,
      icon,
      coverColor,
    }: {
      name: string;
      description?: string;
      icon?: string;
      coverColor?: string;
    }) => collectionService.createCollection(user!.id, name, description, icon, coverColor),
    onSuccess: (newCollection) => {
      queryClient.setQueryData<Collection[]>(
        queryKeys.collections.list(user!.id),
        (old = []) => [newCollection, ...old]
      );
      trackEvent('collection_created', 'action', { name: newCollection.name });
    },
    onError: (error: Error) => {
      trackEvent('collection_create_error', 'error', { error: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Collection> }) =>
      collectionService.updateCollection(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.collections.list(user!.id) });
      const previous = queryClient.getQueryData<Collection[]>(
        queryKeys.collections.list(user!.id)
      );
      queryClient.setQueryData<Collection[]>(
        queryKeys.collections.list(user!.id),
        (old = []) =>
          old.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
          )
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.collections.list(user!.id),
          context.previous
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionService.deleteCollection(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.collections.list(user!.id) });
      const previous = queryClient.getQueryData<Collection[]>(
        queryKeys.collections.list(user!.id)
      );
      queryClient.setQueryData<Collection[]>(
        queryKeys.collections.list(user!.id),
        (old = []) => old.filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.collections.list(user!.id),
          context.previous
        );
      }
    },
    onSuccess: () => {
      trackEvent('collection_deleted', 'action');
    },
  });

  const addDrinkMutation = useMutation({
    mutationFn: ({ collectionId, drinkId }: { collectionId: string; drinkId: string }) =>
      collectionService.addDrinkToCollection(collectionId, drinkId),
    onSuccess: (added, { collectionId }) => {
      if (added) {
        queryClient.setQueryData<Collection[]>(
          queryKeys.collections.list(user!.id),
          (old = []) =>
            old.map((c) =>
              c.id === collectionId
                ? { ...c, drinkCount: (c.drinkCount || 0) + 1 }
                : c
            )
        );
        trackEvent('drink_added_to_collection', 'action', { collectionId });
      }
    },
  });

  const removeDrinkMutation = useMutation({
    mutationFn: ({ collectionId, drinkId }: { collectionId: string; drinkId: string }) =>
      collectionService.removeDrinkFromCollection(collectionId, drinkId),
    onSuccess: (_, { collectionId }) => {
      queryClient.setQueryData<Collection[]>(
        queryKeys.collections.list(user!.id),
        (old = []) =>
          old.map((c) =>
            c.id === collectionId
              ? { ...c, drinkCount: Math.max(0, (c.drinkCount || 0) - 1) }
              : c
          )
      );
      trackEvent('drink_removed_from_collection', 'action', { collectionId });
    },
  });

  const createCollection = async (
    name: string,
    description?: string,
    icon = '📚',
    coverColor = '#8B5CF6'
  ) => {
    if (!user) return null;
    try {
      return await createMutation.mutateAsync({ name, description, icon, coverColor });
    } catch {
      return null;
    }
  };

  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    try {
      await updateMutation.mutateAsync({ id, updates });
      return true;
    } catch {
      return false;
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const togglePublic = async (id: string) => {
    const collection = collections.find((c) => c.id === id);
    if (!collection) return false;

    const newIsPublic = !collection.isPublic;
    const success = await updateCollection(id, { isPublic: newIsPublic });

    if (success) {
      trackEvent(
        newIsPublic ? 'collection_shared' : 'collection_unshared',
        'action'
      );
    }
    return success;
  };

  const addDrinkToCollection = async (collectionId: string, drinkId: string) => {
    try {
      return await addDrinkMutation.mutateAsync({ collectionId, drinkId });
    } catch {
      return false;
    }
  };

  const removeDrinkFromCollection = async (
    collectionId: string,
    drinkId: string
  ) => {
    try {
      await removeDrinkMutation.mutateAsync({ collectionId, drinkId });
      return true;
    } catch {
      return false;
    }
  };

  const getCollectionDrinks = useCallback(
    async (collectionId: string): Promise<Drink[]> => {
      return collectionService.getCollectionDrinks(collectionId);
    },
    []
  );

  const getPublicCollection = async (
    shareId: string
  ): Promise<{ collection: Collection; drinks: Drink[] } | null> => {
    const result = await collectionService.getPublicCollection(shareId);
    if (result) {
      trackEvent('shared_collection_viewed', 'page_view', { shareId });
    }
    return result;
  };

  const getDrinkCollections = useCallback(
    async (drinkId: string): Promise<string[]> => {
      return collectionService.getDrinkCollections(drinkId);
    },
    []
  );

  return {
    collections,
    isLoading,
    createCollection,
    updateCollection,
    deleteCollection,
    togglePublic,
    addDrinkToCollection,
    removeDrinkFromCollection,
    getCollectionDrinks,
    getPublicCollection,
    getDrinkCollections,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.collections.list(user?.id ?? ''),
      }),
  };
}
