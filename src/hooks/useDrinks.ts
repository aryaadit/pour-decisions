import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Drink, DrinkType } from '@/types/drink';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';

const PAGE_SIZE = 50;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data considered fresh

interface DrinksPage {
  drinks: Drink[];
  nextCursor: number | null;
  totalCount: number;
}

function mapDbDrinkToDrink(d: any): Drink {
  return {
    id: d.id,
    name: d.name,
    type: d.type as DrinkType,
    brand: d.brand || undefined,
    rating: d.rating || 0,
    notes: d.notes || undefined,
    location: d.location || undefined,
    price: d.price || undefined,
    dateAdded: new Date(d.date_added),
    imageUrl: d.image_url || undefined,
    isWishlist: d.is_wishlist || false,
  };
}

async function fetchDrinksPage(userId: string, cursor: number = 0): Promise<DrinksPage> {
  const from = cursor;
  const to = cursor + PAGE_SIZE - 1;

  // Get count for pagination
  const { count } = await supabase
    .from('drinks')
    .select('*', { count: 'exact', head: true });

  const { data, error } = await supabase
    .from('drinks')
    .select('*')
    .order('date_added', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const drinks = (data || []).map(mapDbDrinkToDrink);
  const totalCount = count || 0;
  const hasMore = from + drinks.length < totalCount;

  return {
    drinks,
    nextCursor: hasMore ? cursor + PAGE_SIZE : null,
    totalCount,
  };
}

export function useDrinks() {
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['drinks', user?.id],
    queryFn: ({ pageParam = 0 }) => fetchDrinksPage(user!.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
    staleTime: STALE_TIME,
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Flatten all pages into a single drinks array
  const drinks = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.drinks);
  }, [data?.pages]);

  const totalCount = data?.pages?.[0]?.totalCount ?? 0;

  // Add drink mutation
  const addMutation = useMutation({
    mutationFn: async (drink: Omit<Drink, 'id' | 'dateAdded'>) => {
      if (!user) throw new Error('No user');

      // Check for duplicate drink by name (case-insensitive)
      const existingDrink = drinks.find(
        (d) => d.name.toLowerCase().trim() === drink.name.toLowerCase().trim()
      );

      if (existingDrink) {
        if (drink.isWishlist && !existingDrink.isWishlist) {
          // Update existing drink's wishlist status
          const { error } = await supabase
            .from('drinks')
            .update({ is_wishlist: true })
            .eq('id', existingDrink.id);
          if (error) throw error;
          return { ...existingDrink, isWishlist: true };
        }
        return { ...existingDrink, isDuplicate: true } as Drink & { isDuplicate?: boolean };
      }

      const priceValue = drink.price?.trim() || null;

      const { data: newData, error } = await supabase
        .from('drinks')
        .insert({
          user_id: user.id,
          name: drink.name,
          type: drink.type,
          brand: drink.brand || null,
          rating: drink.rating,
          notes: drink.notes || null,
          location: drink.location || null,
          price: priceValue,
          image_url: drink.imageUrl || null,
          is_wishlist: drink.isWishlist || false,
        })
        .select()
        .single();

      if (error) throw error;

      trackEvent('drink_added', 'action', {
        drink_type: drink.type,
        has_image: !!drink.imageUrl,
        has_notes: !!drink.notes,
        has_price: !!priceValue,
        rating: drink.rating,
      });

      return mapDbDrinkToDrink(newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drinks', user?.id] });
    },
    onError: (error) => {
      console.error('Error adding drink:', error);
      trackEvent('drink_add_error', 'error', { error: (error as Error).message });
    },
  });

  // Update drink mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Drink> }) => {
      const dbUpdates: Record<string, any> = {};

      if ('name' in updates) dbUpdates.name = updates.name;
      if ('type' in updates) dbUpdates.type = updates.type;
      if ('brand' in updates) dbUpdates.brand = updates.brand || null;
      if ('rating' in updates) dbUpdates.rating = updates.rating;
      if ('notes' in updates) dbUpdates.notes = updates.notes || null;
      if ('location' in updates) dbUpdates.location = updates.location || null;
      if ('price' in updates) dbUpdates.price = updates.price?.trim() || null;
      if ('imageUrl' in updates) dbUpdates.image_url = updates.imageUrl || null;
      if ('isWishlist' in updates) dbUpdates.is_wishlist = updates.isWishlist;

      const { error } = await supabase
        .from('drinks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      trackEvent('drink_edited', 'action', {
        drink_type: updates.type,
        fields_changed: Object.keys(updates).filter((k) => k !== 'id'),
      });

      return { id, updates };
    },
    onSuccess: ({ id, updates }) => {
      // Optimistically update the cache
      queryClient.setQueryData(['drinks', user?.id], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: DrinksPage) => ({
            ...page,
            drinks: page.drinks.map((d: Drink) =>
              d.id === id ? { ...d, ...updates } : d
            ),
          })),
        };
      });
    },
    onError: (error) => {
      console.error('Error updating drink:', error);
      trackEvent('drink_update_error', 'error', { error: (error as Error).message });
    },
  });

  // Delete drink mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const drinkToDelete = drinks.find((d) => d.id === id);
      const { error } = await supabase.from('drinks').delete().eq('id', id);

      if (error) throw error;

      trackEvent('drink_deleted', 'action', {
        drink_type: drinkToDelete?.type,
      });

      return id;
    },
    onSuccess: (id) => {
      // Optimistically update the cache
      queryClient.setQueryData(['drinks', user?.id], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: DrinksPage) => ({
            ...page,
            drinks: page.drinks.filter((d: Drink) => d.id !== id),
            totalCount: page.totalCount - 1,
          })),
        };
      });
    },
    onError: (error) => {
      console.error('Error deleting drink:', error);
      trackEvent('drink_delete_error', 'error', { error: (error as Error).message });
    },
  });

  // Migrate drinks mutation
  const migrateMutation = useMutation({
    mutationFn: async (typeName: string) => {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('drinks')
        .update({ type: 'other' })
        .eq('type', typeName);

      if (error) throw error;

      return typeName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drinks', user?.id] });
    },
  });

  const addDrink = useCallback(
    async (drink: Omit<Drink, 'id' | 'dateAdded'>) => {
      try {
        return await addMutation.mutateAsync(drink);
      } catch {
        return null;
      }
    },
    [addMutation]
  );

  const updateDrink = useCallback(
    async (id: string, updates: Partial<Drink>) => {
      try {
        await updateMutation.mutateAsync({ id, updates });
      } catch {
        // Error handled in mutation
      }
    },
    [updateMutation]
  );

  const deleteDrink = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        // Error handled in mutation
      }
    },
    [deleteMutation]
  );

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

  const migrateDrinksToOther = useCallback(
    async (typeName: string) => {
      try {
        await migrateMutation.mutateAsync(typeName);
      } catch {
        // Error handled in mutation
      }
    },
    [migrateMutation]
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    drinks,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    loadMore,
    totalCount,
    addDrink,
    updateDrink,
    deleteDrink,
    filterDrinks,
    getDrinkCountByType,
    migrateDrinksToOther,
  };
}
