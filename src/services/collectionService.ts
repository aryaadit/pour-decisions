import { supabase } from '@/integrations/supabase/client';
import { Drink, Collection } from '@/types/drink';
import { mapCollectionRow, mapDrinkRow, mapPublicDrinkRow } from '@/lib/mappers';
import type { Database } from '@/integrations/supabase/types';

type DrinkRow = Database['public']['Tables']['drinks']['Row'];

interface CollectionDrinkJoin {
  drink_id: string;
  position: number | null;
  drinks: DrinkRow | null;
}

interface PublicDrinkRow {
  id: string;
  name: string;
  type: string;
  brand: string | null;
  rating: number | null;
  date_added: string;
  image_url: string | null;
}

export async function fetchCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select(`
      *,
      collection_drinks(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapCollectionRow);
}

export async function createCollection(
  userId: string,
  name: string,
  description?: string,
  icon = '📚',
  coverColor = '#8B5CF6'
): Promise<Collection> {
  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      icon,
      cover_color: coverColor,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    icon: data.icon,
    coverColor: data.cover_color,
    shareId: data.share_id,
    isPublic: data.is_public,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    drinkCount: 0,
  };
}

export async function updateCollection(
  id: string,
  userId: string,
  updates: Partial<Collection>
): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .update({
      name: updates.name,
      description: updates.description || null,
      icon: updates.icon,
      cover_color: updates.coverColor,
      is_public: updates.isPublic,
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteCollection(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function addDrinkToCollection(
  collectionId: string,
  drinkId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('collection_drinks')
    .insert({ collection_id: collectionId, drink_id: drinkId });

  if (error) {
    if (error.code === '23505') return false; // Already in collection
    throw error;
  }
  return true;
}

export async function removeDrinkFromCollection(
  collectionId: string,
  drinkId: string
): Promise<void> {
  const { error } = await supabase
    .from('collection_drinks')
    .delete()
    .eq('collection_id', collectionId)
    .eq('drink_id', drinkId);

  if (error) throw error;
}

export async function getCollectionDrinks(collectionId: string): Promise<Drink[]> {
  const { data, error } = await supabase
    .from('collection_drinks')
    .select(`
      drink_id,
      position,
      drinks (*)
    `)
    .eq('collection_id', collectionId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data as CollectionDrinkJoin[] || [])
    .filter((cd) => cd.drinks)
    .map((cd) => mapDrinkRow(cd.drinks!));
}

export async function getPublicCollection(
  shareId: string
): Promise<{ collection: Collection; drinks: Drink[] } | null> {
  const { data: collectionData, error: collectionError } = await supabase
    .from('collections_public')
    .select('id, name, description, icon, cover_color, share_id, is_public, created_at, updated_at')
    .eq('share_id', shareId)
    .single();

  if (collectionError || !collectionData) return null;

  const { data: collectionDrinksData, error: collectionDrinksError } = await supabase
    .from('collection_drinks_public')
    .select('drink_id, position')
    .eq('collection_id', collectionData.id)
    .order('position', { ascending: true });

  if (collectionDrinksError) return null;

  const drinkIds = (collectionDrinksData || []).map((cd) => cd.drink_id);
  let drinksData: PublicDrinkRow[] = [];

  if (drinkIds.length > 0) {
    const { data: drinksResult, error: drinksError } = await supabase
      .from('drinks_public')
      .select('id, name, type, brand, rating, date_added, image_url')
      .in('id', drinkIds);

    if (drinksError) return null;
    drinksData = drinksResult || [];
  }

  const drinksMap = new Map(drinksData.map((d) => [d.id, d]));
  const orderedDrinks = (collectionDrinksData || [])
    .map((cd) => drinksMap.get(cd.drink_id))
    .filter(Boolean);

  const collection: Collection = {
    id: collectionData.id,
    name: collectionData.name,
    description: collectionData.description || undefined,
    icon: collectionData.icon,
    coverColor: collectionData.cover_color,
    shareId: collectionData.share_id,
    isPublic: collectionData.is_public,
    createdAt: new Date(collectionData.created_at),
    updatedAt: new Date(collectionData.updated_at),
    drinkCount: orderedDrinks.length,
  };

  const drinks: Drink[] = orderedDrinks.map((d) => mapPublicDrinkRow(d as PublicDrinkRow));

  return { collection, drinks };
}

export async function getDrinkCollections(drinkId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('collection_drinks')
    .select('collection_id')
    .eq('drink_id', drinkId);

  if (error) throw error;
  return (data || []).map((cd) => cd.collection_id);
}

export async function fetchPublicCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*, collection_drinks(count)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapCollectionRow);
}
