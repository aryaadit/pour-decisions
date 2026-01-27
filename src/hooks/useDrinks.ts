import { useState, useEffect, useCallback } from 'react';
import { Drink, DrinkType } from '@/types/drink';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';

export function useDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  const fetchDrinks = useCallback(async () => {
    if (!user) {
      setDrinks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('drinks')
      .select('*')
      .order('date_added', { ascending: false });

    if (error) {
      console.error('Error fetching drinks:', error);
    } else {
      setDrinks(
        (data || []).map((d) => ({
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
        }))
      );
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDrinks();
  }, [fetchDrinks]);

  const addDrink = async (drink: Omit<Drink, 'id' | 'dateAdded'>) => {
    if (!user) return null;

    // Check for duplicate drink by name (case-insensitive)
    const existingDrink = drinks.find(
      (d) => d.name.toLowerCase().trim() === drink.name.toLowerCase().trim()
    );

    if (existingDrink) {
      // If trying to add to wishlist and drink exists, just update wishlist status
      if (drink.isWishlist && !existingDrink.isWishlist) {
        await updateDrink(existingDrink.id, { isWishlist: true });
        return existingDrink;
      }
      // Return null to indicate a duplicate was found
      return { ...existingDrink, isDuplicate: true } as Drink & { isDuplicate?: boolean };
    }

    const priceValue = drink.price?.trim() || null;

    const { data, error } = await supabase
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

    if (error) {
      console.error('Error adding drink:', error);
      trackEvent('drink_add_error', 'error', { error: error.message });
      return null;
    }

    const newDrink: Drink = {
      id: data.id,
      name: data.name,
      type: data.type as DrinkType,
      brand: data.brand || undefined,
      rating: data.rating || 0,
      notes: data.notes || undefined,
      location: data.location || undefined,
      price: data.price || undefined,
      dateAdded: new Date(data.date_added),
      imageUrl: data.image_url || undefined,
      isWishlist: data.is_wishlist || false,
    };

    setDrinks((prev) => [newDrink, ...prev]);
    
    trackEvent('drink_added', 'action', {
      drink_type: drink.type,
      has_image: !!drink.imageUrl,
      has_notes: !!drink.notes,
      has_price: !!priceValue,
      rating: drink.rating,
    });
    
    return newDrink;
  };

  const updateDrink = async (id: string, updates: Partial<Drink>) => {
    // Only include fields that are explicitly provided in updates
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

    if (error) {
      console.error('Error updating drink:', error);
      trackEvent('drink_update_error', 'error', { error: error.message });
      return;
    }

    setDrinks((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...updates,
            }
          : d
      )
    );

    trackEvent('drink_edited', 'action', {
      drink_type: updates.type,
      fields_changed: Object.keys(updates).filter(k => k !== 'id'),
    });
  };

  const deleteDrink = async (id: string) => {
    const drinkToDelete = drinks.find(d => d.id === id);
    const { error } = await supabase.from('drinks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting drink:', error);
      trackEvent('drink_delete_error', 'error', { error: error.message });
      return;
    }

    setDrinks((prev) => prev.filter((d) => d.id !== id));
    
    trackEvent('drink_deleted', 'action', {
      drink_type: drinkToDelete?.type,
    });
  };

  const filterDrinks = (type?: DrinkType, searchQuery?: string) => {
    return drinks.filter((drink) => {
      const matchesType = !type || drink.type === type;
      const matchesSearch =
        !searchQuery ||
        drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drink.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drink.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  const getDrinkCountByType = () => {
    const counts: Record<string, number> = {};
    drinks.forEach((drink) => {
      counts[drink.type] = (counts[drink.type] || 0) + 1;
    });
    return counts;
  };

  const migrateDrinksToOther = async (typeName: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('drinks')
      .update({ type: 'other' })
      .eq('type', typeName);

    if (error) {
      console.error('Error migrating drinks:', error);
      return;
    }

    // Update local state
    setDrinks((prev) =>
      prev.map((d) =>
        d.type === typeName ? { ...d, type: 'other' as DrinkType } : d
      )
    );
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
