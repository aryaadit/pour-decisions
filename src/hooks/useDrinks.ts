import { useState, useEffect, useCallback } from 'react';
import { Drink, DrinkType } from '@/types/drink';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

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
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding drink:', error);
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
    };

    setDrinks((prev) => [newDrink, ...prev]);
    return newDrink;
  };

  const updateDrink = async (id: string, updates: Partial<Drink>) => {
    const priceValue = updates.price?.trim() || null;

    const { error } = await supabase
      .from('drinks')
      .update({
        name: updates.name,
        type: updates.type,
        brand: updates.brand || null,
        rating: updates.rating,
        notes: updates.notes || null,
        location: updates.location || null,
        price: priceValue,
        image_url: updates.imageUrl || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating drink:', error);
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
  };

  const deleteDrink = async (id: string) => {
    const { error } = await supabase.from('drinks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting drink:', error);
      return;
    }

    setDrinks((prev) => prev.filter((d) => d.id !== id));
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
