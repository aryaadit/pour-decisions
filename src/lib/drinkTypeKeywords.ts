import { DrinkType } from '@/types/drink';

const keywordMap: Record<string, DrinkType> = {
  // Beer
  ipa: 'beer',
  lager: 'beer',
  stout: 'beer',
  ale: 'beer',
  pilsner: 'beer',
  porter: 'beer',
  wheat: 'beer',
  hazy: 'beer',
  sour: 'beer',
  hefeweizen: 'beer',
  saison: 'beer',
  kolsch: 'beer',
  amber: 'beer',
  'pale ale': 'beer',
  // Wine
  cabernet: 'wine',
  merlot: 'wine',
  chardonnay: 'wine',
  pinot: 'wine',
  'rosé': 'wine',
  rose: 'wine',
  champagne: 'wine',
  prosecco: 'wine',
  riesling: 'wine',
  sauvignon: 'wine',
  malbec: 'wine',
  syrah: 'wine',
  shiraz: 'wine',
  zinfandel: 'wine',
  tempranillo: 'wine',
  sangiovese: 'wine',
  // Cocktail
  margarita: 'cocktail',
  mojito: 'cocktail',
  negroni: 'cocktail',
  'old fashioned': 'cocktail',
  daiquiri: 'cocktail',
  martini: 'cocktail',
  spritz: 'cocktail',
  cosmopolitan: 'cocktail',
  manhattan: 'cocktail',
  gimlet: 'cocktail',
  paloma: 'cocktail',
  sidecar: 'cocktail',
  'mai tai': 'cocktail',
  // Whiskey
  bourbon: 'whiskey',
  scotch: 'whiskey',
  rye: 'whiskey',
  'single malt': 'whiskey',
  highland: 'whiskey',
  islay: 'whiskey',
  speyside: 'whiskey',
};

// Sort keywords by length descending so multi-word matches take priority
const sortedKeywords = Object.keys(keywordMap).sort((a, b) => b.length - a.length);

export function detectDrinkType(name: string): DrinkType | null {
  const lower = name.toLowerCase();
  for (const keyword of sortedKeywords) {
    if (lower.includes(keyword)) {
      return keywordMap[keyword];
    }
  }
  return null;
}
