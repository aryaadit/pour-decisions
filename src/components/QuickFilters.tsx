import { useMemo } from 'react';
import { DrinkType, builtInDrinkTypes, drinkTypeIcons, drinkTypeLabels, isBuiltInDrinkType } from '@/types/drink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { Clock } from 'lucide-react';

interface QuickFiltersProps {
  selectedType: DrinkType | null;
  onSelectType: (type: DrinkType | null) => void;
  drinkCountByType: Record<string, number>;
  totalDrinks: number;
  wishlistCount?: number;
  showWishlist?: boolean;
  onToggleWishlist?: () => void;
}

export function QuickFilters({ 
  selectedType, 
  onSelectType, 
  drinkCountByType,
  totalDrinks,
  wishlistCount = 0,
  showWishlist = false,
  onToggleWishlist,
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

  const getTypeIcon = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) {
      return drinkTypeIcons[type];
    }
    const custom = customTypes.find((c) => c.name === type);
    return custom?.icon || '🍹';
  };

  const getTypeLabel = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) {
      return drinkTypeLabels[type];
    }
    return type; // Custom types use their name as label
  };

  const getCustomColor = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) return null;
    return customTypes.find((c) => c.name === type)?.color || null;
  };

  // Don't render if no drinks
  if (totalDrinks === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
      {/* Wishlist toggle - separate from type pills */}
      {wishlistCount > 0 && onToggleWishlist && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            selectionChanged();
            onToggleWishlist();
            if (!showWishlist) onSelectType(null);
          }}
          className={cn(
            'shrink-0 h-8 w-8 rounded-full transition-all duration-200',
            showWishlist && 'text-orange-500 bg-orange-500/15 hover:bg-orange-500/25',
            !showWishlist && 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title={showWishlist ? 'Hide wishlist' : `Show wishlist (${wishlistCount})`}
        >
          <Clock className={cn("w-4 h-4", showWishlist && "fill-orange-500/30")} />
        </Button>
      )}

      {/* Divider when wishlist is visible */}
      {wishlistCount > 0 && onToggleWishlist && (
        <div className="h-5 w-px bg-border/50 shrink-0" />
      )}

      {/* All filter - always visible */}
      <Button
        variant={selectedType === null && !showWishlist ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          handleSelect(null);
          if (showWishlist && onToggleWishlist) onToggleWishlist();
        }}
        className={cn(
          'shrink-0 h-8 px-3 text-xs font-medium rounded-full transition-all duration-200',
          selectedType === null && !showWishlist && 'shadow-glow'
        )}
      >
        All
        <span className="ml-1.5 opacity-70">{totalDrinks}</span>
      </Button>

      {/* Top types with counts */}
      {topTypes.map(({ type, count }) => {
        const customColor = getCustomColor(type);
        const isSelected = selectedType === type;
        
        return (
          <Button
            key={type}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelect(type)}
            className={cn(
              'shrink-0 h-8 px-3 text-xs font-medium rounded-full transition-all duration-200',
              isSelected && 'shadow-glow',
              !isSelected && 'bg-muted/50 border-border/50 hover:bg-muted hover:border-border'
            )}
            style={customColor && !isSelected ? {
              color: customColor,
              borderColor: `${customColor}40`,
              backgroundColor: `${customColor}15`,
            } : customColor && isSelected ? {
              backgroundColor: customColor,
              borderColor: customColor,
            } : undefined}
          >
            <span className={cn(isSelected && "mr-1")}>{getTypeIcon(type)}</span>
            {isSelected ? (
              <span>{getTypeLabel(type)} <span className="opacity-70 ml-1">{count}</span></span>
            ) : (
              <span className="opacity-70">{count}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
