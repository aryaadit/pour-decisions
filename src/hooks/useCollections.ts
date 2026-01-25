import { useState, useEffect, useCallback } from 'react';
import { Collection, Drink, DrinkType } from '@/types/drink';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  const fetchCollections = useCallback(async () => {
    if (!user) {
      setCollections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Fetch collections with drink counts
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        collection_drinks(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
    } else {
      setCollections(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || undefined,
          icon: c.icon,
          coverColor: c.cover_color,
          shareId: c.share_id,
          isPublic: c.is_public,
          isSystem: c.is_system || false,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
          drinkCount: c.collection_drinks?.[0]?.count || 0,
        }))
      );
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const createCollection = async (
    name: string,
    description?: string,
    icon = '📚',
    coverColor = '#8B5CF6'
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        icon,
        cover_color: coverColor,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      trackEvent('collection_create_error', 'error', { error: error.message });
      return null;
    }

    const newCollection: Collection = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      icon: data.icon,
      coverColor: data.cover_color,
      shareId: data.share_id,
      isPublic: data.is_public,
      isSystem: data.is_system || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      drinkCount: 0,
    };

    setCollections((prev) => [newCollection, ...prev]);
    trackEvent('collection_created', 'action', { name });
    return newCollection;
  };

  const updateCollection = async (id: string, updates: Partial<Collection>) => {
    const { error } = await supabase
      .from('collections')
      .update({
        name: updates.name,
        description: updates.description || null,
        icon: updates.icon,
        cover_color: updates.coverColor,
        is_public: updates.isPublic,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating collection:', error);
      return false;
    }

    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c))
    );
    return true;
  };

  const deleteCollection = async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id);

    if (error) {
      console.error('Error deleting collection:', error);
      return false;
    }

    setCollections((prev) => prev.filter((c) => c.id !== id));
    trackEvent('collection_deleted', 'action');
    return true;
  };

  const togglePublic = async (id: string) => {
    const collection = collections.find((c) => c.id === id);
    if (!collection) return false;

    const newIsPublic = !collection.isPublic;
    const success = await updateCollection(id, { isPublic: newIsPublic });
    
    if (success) {
      trackEvent(newIsPublic ? 'collection_shared' : 'collection_unshared', 'action');
    }
    return success;
  };

  const addDrinkToCollection = async (collectionId: string, drinkId: string) => {
    const { error } = await supabase
      .from('collection_drinks')
      .insert({ collection_id: collectionId, drink_id: drinkId });

    if (error) {
      if (error.code === '23505') {
        // Already in collection
        return false;
      }
      console.error('Error adding drink to collection:', error);
      return false;
    }

    // Update local count
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, drinkCount: (c.drinkCount || 0) + 1 } : c
      )
    );
    
    trackEvent('drink_added_to_collection', 'action', { collectionId });
    return true;
  };

  const removeDrinkFromCollection = async (collectionId: string, drinkId: string) => {
    const { error } = await supabase
      .from('collection_drinks')
      .delete()
      .eq('collection_id', collectionId)
      .eq('drink_id', drinkId);

    if (error) {
      console.error('Error removing drink from collection:', error);
      return false;
    }

    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, drinkCount: Math.max(0, (c.drinkCount || 0) - 1) } : c
      )
    );
    
    trackEvent('drink_removed_from_collection', 'action', { collectionId });
    return true;
  };

  const getCollectionDrinks = async (collectionId: string): Promise<Drink[]> => {
    const { data, error } = await supabase
      .from('collection_drinks')
      .select(`
        drink_id,
        position,
        drinks (*)
      `)
      .eq('collection_id', collectionId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching collection drinks:', error);
      return [];
    }

    return (data || [])
      .filter((cd: any) => cd.drinks)
      .map((cd: any) => ({
        id: cd.drinks.id,
        name: cd.drinks.name,
        type: cd.drinks.type as DrinkType,
        brand: cd.drinks.brand || undefined,
        rating: cd.drinks.rating || 0,
        notes: cd.drinks.notes || undefined,
        location: cd.drinks.location || undefined,
        price: cd.drinks.price || undefined,
        dateAdded: new Date(cd.drinks.date_added),
        imageUrl: cd.drinks.image_url || undefined,
        isWishlist: cd.drinks.is_wishlist || false,
      }));
  };

  const getPublicCollection = async (shareId: string): Promise<{ collection: Collection; drinks: Drink[] } | null> => {
    // Use the collections_public view to prevent user_id exposure
    const { data: collectionData, error: collectionError } = await supabase
      .from('collections_public')
      .select('*')
      .eq('share_id', shareId)
      .single();

    if (collectionError || !collectionData) {
      console.error('Error fetching public collection:', collectionError);
      return null;
    }

    const { data: drinksData, error: drinksError } = await supabase
      .from('collection_drinks')
      .select(`
        drink_id,
        position,
        drinks (*)
      `)
      .eq('collection_id', collectionData.id)
      .order('position', { ascending: true });

    if (drinksError) {
      console.error('Error fetching public collection drinks:', drinksError);
      return null;
    }

    const collection: Collection = {
      id: collectionData.id,
      name: collectionData.name,
      description: collectionData.description || undefined,
      icon: collectionData.icon,
      coverColor: collectionData.cover_color,
      shareId: collectionData.share_id,
      isPublic: collectionData.is_public,
      isSystem: false, // Public view doesn't expose is_system
      createdAt: new Date(collectionData.created_at),
      updatedAt: new Date(collectionData.updated_at),
      drinkCount: drinksData?.length || 0,
    };

    const drinks: Drink[] = (drinksData || [])
      .filter((cd: any) => cd.drinks)
      .map((cd: any) => ({
        id: cd.drinks.id,
        name: cd.drinks.name,
        type: cd.drinks.type as DrinkType,
        brand: cd.drinks.brand || undefined,
        rating: cd.drinks.rating || 0,
        notes: cd.drinks.notes || undefined,
        location: cd.drinks.location || undefined,
        price: cd.drinks.price || undefined,
        dateAdded: new Date(cd.drinks.date_added),
        imageUrl: cd.drinks.image_url || undefined,
        isWishlist: cd.drinks.is_wishlist || false,
      }));

    trackEvent('shared_collection_viewed', 'page_view', { shareId });
    
    return { collection, drinks };
  };

  const getDrinkCollections = useCallback(async (drinkId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('collection_drinks')
      .select('collection_id')
      .eq('drink_id', drinkId);

    if (error) {
      console.error('Error fetching drink collections:', error);
      return [];
    }

    return (data || []).map((cd) => cd.collection_id);
  }, []);


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
    refetch: fetchCollections,
  };
}
