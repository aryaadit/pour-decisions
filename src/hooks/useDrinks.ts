import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Drink, DrinkType } from '@/types/drink';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { queryKeys } from '@/lib/queryKeys';
import * as drinkService from '@/services/drinkService';

export function useDrinks() {
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();

  const { data: drinks = [], isLoading } = useQuery({
    queryKey: queryKeys.drinks.list(user?.id ?? ''),
    queryFn: () => drinkService.fetchDrinks(user!.id),
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: (drink: Omit<Drink, 'id' | 'dateAdded'>) =>
      drinkService.insertDrink(user!.id, drink),
    onSuccess: (newDrink, drink) => {
      queryClient.setQueryData<Drink[]>(
        queryKeys.drinks.list(user!.id),
        (old = []) => [newDrink, ...old]
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      trackEvent('drink_added', 'action', {
        drink_type: drink.type,
        has_image: !!drink.imageUrl,
        has_notes: !!drink.notes,
        has_price: !!drink.price?.trim(),
        rating: drink.rating,
      });
    },
    onError: (error: Error) => {
      trackEvent('drink_add_error', 'error', { error: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Drink> }) =>
      drinkService.updateDrink(id, user!.id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.drinks.list(user!.id) });
      const previous = queryClient.getQueryData<Drink[]>(queryKeys.drinks.list(user!.id));
      queryClient.setQueryData<Drink[]>(
        queryKeys.drinks.list(user!.id),
        (old = []) => old.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );
      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.drinks.list(user!.id), context.previous);
      }
      trackEvent('drink_update_error', 'error', { error: error.message });
    },
    onSuccess: (_, { updates }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      trackEvent('drink_edited', 'action', {
        drink_type: updates.type,
        fields_changed: Object.keys(updates).filter((k) => k !== 'id'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => drinkService.deleteDrink(id, user!.id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.drinks.list(user!.id) });
      const previous = queryClient.getQueryData<Drink[]>(queryKeys.drinks.list(user!.id));
      const drinkToDelete = previous?.find((d) => d.id === id);
      queryClient.setQueryData<Drink[]>(
        queryKeys.drinks.list(user!.id),
        (old = []) => old.filter((d) => d.id !== id)
      );
      return { previous, drinkToDelete };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.drinks.list(user!.id), context.previous);
      }
      trackEvent('drink_delete_error', 'error', { error: error.message });
    },
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      trackEvent('drink_deleted', 'action', {
        drink_type: context?.drinkToDelete?.type,
      });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: (typeName: string) => drinkService.migrateDrinksToType(typeName),
    onMutate: async (typeName) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.drinks.list(user!.id) });
      const previous = queryClient.getQueryData<Drink[]>(queryKeys.drinks.list(user!.id));
      queryClient.setQueryData<Drink[]>(
        queryKeys.drinks.list(user!.id),
        (old = []) =>
          old.map((d) =>
            d.type === typeName ? { ...d, type: 'other' as DrinkType } : d
          )
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.drinks.list(user!.id), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats.all });
    },
  });

  const addDrink = async (drink: Omit<Drink, 'id' | 'dateAdded'>) => {
    if (!user) return null;

    // Check for duplicate drink by name (case-insensitive) using cache
    const existingDrink = drinks.find(
      (d) => d.name.toLowerCase().trim() === drink.name.toLowerCase().trim()
    );

    if (existingDrink) {
      return { ...existingDrink, isDuplicate: true } as Drink & { isDuplicate?: boolean };
    }

    try {
      return await addMutation.mutateAsync(drink);
    } catch {
      return null;
    }
  };

  const updateDrink = async (id: string, updates: Partial<Drink>) => {
    if (!user) return;
    await updateMutation.mutateAsync({ id, updates });
  };

  const deleteDrink = async (id: string) => {
    if (!user) return;
    await deleteMutation.mutateAsync(id);
  };

  const filterDrinks = useCallback(
    (type?: DrinkType, searchQuery?: string) => {
      return drinks.filter((drink) => {
        const matchesType = !type || drink.type === type;
        const matchesSearch =
          !searchQuery ||
          drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          drink.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          drink.notes?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
      });
    },
    [drinks]
  );

  const getDrinkCountByType = useCallback(() => {
    const counts: Record<string, number> = {};
    drinks.forEach((drink) => {
      counts[drink.type] = (counts[drink.type] || 0) + 1;
    });
    return counts;
  }, [drinks]);

  const migrateDrinksToOther = async (typeName: string) => {
    if (!user) return;
    await migrateMutation.mutateAsync(typeName);
  };

  return {
    drinks,
    isLoading,
    addDrink,
    updateDrink,
    deleteDrink,
    filterDrinks,
    getDrinkCountByType,
    migrateDrinksToOther,
  };
}
