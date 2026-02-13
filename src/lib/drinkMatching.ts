export function normalizeDrinkKey(name: string, type: string): string {
  return `${name.toLowerCase().trim()}|${type.toLowerCase()}`;
}
