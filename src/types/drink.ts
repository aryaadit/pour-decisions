export type DrinkType = 'whiskey' | 'beer' | 'wine' | 'cocktail' | 'other';

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
}

export const drinkTypeLabels: Record<DrinkType, string> = {
  whiskey: 'Whiskey',
  beer: 'Beer',
  wine: 'Wine',
  cocktail: 'Cocktail',
  other: 'Other',
};

export const drinkTypeIcons: Record<DrinkType, string> = {
  whiskey: '🥃',
  beer: '🍺',
  wine: '🍷',
  cocktail: '🍸',
  other: '🥤',
};
