import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CustomDrinkType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export function useCustomDrinkTypes() {
  const [customTypes, setCustomTypes] = useState<CustomDrinkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchCustomTypes = useCallback(async () => {
    if (!user) {
      setCustomTypes([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('custom_drink_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching custom drink types:', error);
    } else {
      setCustomTypes(
        (data || []).map((d) => ({
          id: d.id,
          name: d.name,
          icon: d.icon,
          color: d.color,
        }))
      );
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCustomTypes();
  }, [fetchCustomTypes]);

  const addCustomType = async (name: string, icon: string = '🍹', color: string = '#8B5CF6') => {
    if (!user) return null;

    // Check if already exists
    const exists = customTypes.some(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return { error: 'A drink type with this name already exists' };
    }

    const { data, error } = await supabase
      .from('custom_drink_types')
      .insert({
        user_id: user.id,
        name: name.trim(),
        icon,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding custom drink type:', error);
      return { error: error.message };
    }

    const newType: CustomDrinkType = {
      id: data.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
    };

    setCustomTypes((prev) => [...prev, newType]);
    return { data: newType };
  };

  const updateCustomType = async (id: string, updates: { name?: string; icon?: string; color?: string }) => {
    if (!user) return { error: 'Not authenticated' };

    // Check if name already exists (if updating name)
    if (updates.name) {
      const exists = customTypes.some(
        (t) => t.id !== id && t.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (exists) {
        return { error: 'A drink type with this name already exists' };
      }
    }

    const { data, error } = await supabase
      .from('custom_drink_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom drink type:', error);
      return { error: error.message };
    }

    setCustomTypes((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, name: data.name, icon: data.icon, color: data.color }
          : t
      )
    );
    return { data };
  };

  const deleteCustomType = async (id: string) => {
    const { error } = await supabase
      .from('custom_drink_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting custom drink type:', error);
      return { error: error.message };
    }

    setCustomTypes((prev) => prev.filter((t) => t.id !== id));
    return { data: true };
  };

  return {
    customTypes,
    isLoading,
    addCustomType,
    updateCustomType,
    deleteCustomType,
    refetch: fetchCustomTypes,
  };
}
