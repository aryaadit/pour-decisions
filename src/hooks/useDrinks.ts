import { useState, useEffect } from 'react';
import { Drink, DrinkType } from '@/types/drink';

const STORAGE_KEY = 'drink-tracker-drinks';

const sampleDrinks: Drink[] = [
  {
    id: '1',
    name: 'Lagavulin 16',
    type: 'whiskey',
    brand: 'Lagavulin',
    rating: 5,
    notes: 'Incredible smoky, peaty flavor. Perfect for a cold evening. Long finish with hints of seaweed and iodine.',
    location: 'The Whiskey Bar, NYC',
    price: '$18/pour',
    dateAdded: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Heady Topper',
    type: 'beer',
    brand: 'The Alchemist',
    rating: 5,
    notes: 'Best DIPA I\'ve ever had. Juicy, hoppy, no bitterness. Drink from the can!',
    location: 'Vermont trip',
    dateAdded: new Date('2024-02-20'),
  },
  {
    id: '3',
    name: 'Château Margaux 2015',
    type: 'wine',
    brand: 'Château Margaux',
    rating: 5,
    notes: 'Exceptional Bordeaux. Elegant tannins, black currant, violet notes. Worth the splurge.',
    price: '$45/glass',
    dateAdded: new Date('2024-03-10'),
  },
  {
    id: '4',
    name: 'Paper Plane',
    type: 'cocktail',
    rating: 4,
    notes: 'Equal parts bourbon, Aperol, Amaro Nonino, lemon. Perfectly balanced bitter-sweet.',
    location: 'Death & Co',
    dateAdded: new Date('2024-03-25'),
  },
];

export function useDrinks() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setDrinks(parsed.map((d: Drink) => ({ ...d, dateAdded: new Date(d.dateAdded) })));
    } else {
      setDrinks(sampleDrinks);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleDrinks));
    }
    setIsLoading(false);
  }, []);

  const saveDrinks = (newDrinks: Drink[]) => {
    setDrinks(newDrinks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrinks));
  };

  const addDrink = (drink: Omit<Drink, 'id' | 'dateAdded'>) => {
    const newDrink: Drink = {
      ...drink,
      id: crypto.randomUUID(),
      dateAdded: new Date(),
    };
    saveDrinks([newDrink, ...drinks]);
    return newDrink;
  };

  const updateDrink = (id: string, updates: Partial<Drink>) => {
    saveDrinks(drinks.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDrink = (id: string) => {
    saveDrinks(drinks.filter(d => d.id !== id));
  };

  const filterDrinks = (type?: DrinkType, searchQuery?: string) => {
    return drinks.filter(drink => {
      const matchesType = !type || drink.type === type;
      const matchesSearch = !searchQuery || 
        drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drink.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drink.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  return {
    drinks,
    isLoading,
    addDrink,
    updateDrink,
    deleteDrink,
    filterDrinks,
  };
}
