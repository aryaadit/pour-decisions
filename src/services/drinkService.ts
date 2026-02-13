import { supabase } from '@/integrations/supabase/client';
import { Drink, DrinkType, isBuiltInDrinkType } from '@/types/drink';
import { mapDrinkRow, mapPublicDrinkRow } from '@/lib/mappers';

export async function fetchDrinks(userId: string): Promise<Drink[]> {
  const { data, error } = await supabase
    .from('drinks')
    .select('*')
    .eq('user_id', userId)
    .order('date_added', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDrinkRow);
}

export async function fetchDrinkById(id: string): Promise<Drink | null> {
  const { data, error } = await supabase
    .from('drinks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDrinkRow(data) : null;
}

export async function fetchPublicDrinkById(id: string): Promise<Drink | null> {
  const { data, error } = await supabase
    .from('drinks_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPublicDrinkRow(data) : null;
}

export async function insertDrink(
  userId: string,
  drink: Omit<Drink, 'id' | 'dateAdded'>
): Promise<Drink> {
  const priceValue = drink.price?.trim() || null;

  const { data, error } = await supabase
    .from('drinks')
    .insert({
      user_id: userId,
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
  return mapDrinkRow(data);
}

export async function updateDrink(
  id: string,
  updates: Partial<Drink>
): Promise<void> {
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
}

export async function deleteDrink(id: string): Promise<void> {
  const { error } = await supabase.from('drinks').delete().eq('id', id);
  if (error) throw error;
}

export async function migrateDrinksToType(typeName: string): Promise<void> {
  const { error } = await supabase
    .from('drinks')
    .update({ type: 'other' })
    .eq('type', typeName);

  if (error) throw error;
}

/**
 * Convert a storage path like "drink-images/userId/file.jpg" to a signed URL.
 * Returns undefined if the conversion fails.
 */
async function resolveStorageUrl(storagePath: string): Promise<string | undefined> {
  // Already a full URL — use as-is
  if (storagePath.startsWith('http')) return storagePath;

  // Parse "bucket/path" format
  const slashIndex = storagePath.indexOf('/');
  if (slashIndex === -1) return undefined;

  const bucket = storagePath.substring(0, slashIndex);
  const path = storagePath.substring(slashIndex + 1);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300); // 5 min — enough for the AI to fetch

  if (error) {
    console.error('Failed to create signed URL for lookup:', error);
    return undefined;
  }

  return data.signedUrl;
}

export async function lookupDrink(params: {
  drinkName?: string;
  drinkType: DrinkType;
  brand?: string;
  imageUrl?: string;
}) {
  // Convert storage path to a signed URL the edge function & AI can access
  let resolvedImageUrl = params.imageUrl
    ? await resolveStorageUrl(params.imageUrl)
    : undefined;

  if (params.imageUrl && !resolvedImageUrl) {
    console.warn('[lookup] Could not resolve image URL:', params.imageUrl);
  }

  // Edge function only accepts built-in types; map custom types to "other"
  const safeType = isBuiltInDrinkType(params.drinkType)
    ? params.drinkType
    : 'other';

  const { data, error } = await supabase.functions.invoke('lookup-drink', {
    body: {
      drinkName: params.drinkName,
      drinkType: safeType,
      brand: params.brand,
      imageUrl: resolvedImageUrl,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function uploadDrinkImage(
  userId: string,
  file: File | Blob
): Promise<string> {
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('drink-images')
    .upload(filePath, file);

  if (error) throw error;
  return `drink-images/${filePath}`;
}
