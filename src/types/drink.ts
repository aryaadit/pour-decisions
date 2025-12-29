export type BuiltInDrinkType = 'whiskey' | 'beer' | 'wine' | 'cocktail' | 'other';

// DrinkType can be a built-in type or a custom type name (string)
export type DrinkType = BuiltInDrinkType | string;

export interface Drink {
  id: string;
  name: string;
  type: DrinkType;
  brand?: string;
  rating: number;
  notes?: string;
  location?: string;
  price?: string;
  dateAdded: Date;
  imageUrl?: string;
  isFavorite?: boolean;
}

export const builtInDrinkTypes: BuiltInDrinkType[] = ['whiskey', 'beer', 'wine', 'cocktail', 'other'];

export const drinkTypeLabels: Record<BuiltInDrinkType, string> = {
  whiskey: 'Whiskey',
  beer: 'Beer',
  wine: 'Wine',
  cocktail: 'Cocktail',
  other: 'Other',
};

export const drinkTypeIcons: Record<BuiltInDrinkType, string> = {
  whiskey: '🥃',
  beer: '🍺',
  wine: '🍷',
  cocktail: '🍸',
  other: '🥤',
};

export function isBuiltInDrinkType(type: string): type is BuiltInDrinkType {
  return builtInDrinkTypes.includes(type as BuiltInDrinkType);
}
