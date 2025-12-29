import { useMemo } from 'react';
import { DrinkType, builtInDrinkTypes, drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { Heart } from 'lucide-react';

interface QuickFiltersProps {
  selectedType: DrinkType | null;
  onSelectType: (type: DrinkType | null) => void;
  drinkCountByType: Record<string, number>;
  totalDrinks: number;
  favoritesCount?: number;
  showFavoritesOnly?: boolean;
  onToggleFavoritesFilter?: () => void;
}

export function QuickFilters({ 
  selectedType, 
  onSelectType, 
  drinkCountByType,
  totalDrinks,
  favoritesCount = 0,
  showFavoritesOnly = false,
  onToggleFavoritesFilter,
}: QuickFiltersProps) {
  const { selectionChanged } = useHaptics();
  const { customTypes } = useCustomDrinkTypes();

  // Get top 3 types with most drinks (excluding "All")
  const topTypes = useMemo(() => {
    const allTypes = [
      ...builtInDrinkTypes.map(type => ({ type, count: drinkCountByType[type] || 0, isCustom: false })),
      ...customTypes.map(ct => ({ type: ct.name as DrinkType, count: drinkCountByType[ct.name] || 0, isCustom: true, customType: ct })),
    ];
    
    return allTypes
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [drinkCountByType, customTypes]);

  const handleSelect = (type: DrinkType | null) => {
    if (type !== selectedType) {
      selectionChanged();
    }
    onSelectType(type);
  };

  const handleFavoritesToggle = () => {
    selectionChanged();
    onToggleFavoritesFilter?.();
  };

  const getTypeIcon = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) {
      return drinkTypeIcons[type];
    }
    const custom = customTypes.find((c) => c.name === type);
    return custom?.icon || '🍹';
  };

  const getCustomColor = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) return null;
    return customTypes.find((c) => c.name === type)?.color || null;
  };

  // Don't render if no drinks
  if (totalDrinks === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
      {/* All filter - always visible */}
      <Button
        variant={selectedType === null && !showFavoritesOnly ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          handleSelect(null);
          if (showFavoritesOnly) onToggleFavoritesFilter?.();
        }}
        className={cn(
          'shrink-0 h-8 px-3 text-xs font-medium rounded-full transition-all duration-200',
          selectedType === null && !showFavoritesOnly && 'shadow-glow'
        )}
      >
        All
        <span className="ml-1.5 opacity-70">{totalDrinks}</span>
      </Button>

      {/* Favorites filter */}
      {onToggleFavoritesFilter && favoritesCount > 0 && (
        <Button
          variant={showFavoritesOnly ? 'default' : 'ghost'}
          size="sm"
          onClick={handleFavoritesToggle}
          className={cn(
            'shrink-0 h-8 px-3 text-xs font-medium rounded-full transition-all duration-200',
            showFavoritesOnly && 'shadow-glow bg-red-500 hover:bg-red-600 text-white'
          )}
        >
          <Heart className={cn(
            "w-3.5 h-3.5 mr-1",
            showFavoritesOnly && "fill-current"
          )} />
          <span className="opacity-70">{favoritesCount}</span>
        </Button>
      )}

      {/* Top types with counts */}
      {topTypes.map(({ type, count }) => {
        const customColor = getCustomColor(type);
        const isSelected = selectedType === type && !showFavoritesOnly;
        
        return (
          <Button
            key={type}
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              handleSelect(type);
              if (showFavoritesOnly) onToggleFavoritesFilter?.();
            }}
            className={cn(
              'shrink-0 h-8 px-3 text-xs font-medium rounded-full transition-all duration-200',
              isSelected && 'shadow-glow'
            )}
            style={customColor && !isSelected ? {
              color: customColor,
            } : customColor && isSelected ? {
              backgroundColor: customColor,
              borderColor: customColor,
            } : undefined}
          >
            <span className="mr-1">{getTypeIcon(type)}</span>
            <span className="opacity-70">{count}</span>
          </Button>
        );
      })}
    </div>
  );
}
