import { Wine } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DrinkTypeBadge } from '@/components/DrinkTypeBadge';
import { TopDrink } from '@/hooks/useProfileStats';
import { drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';

interface TopDrinksShowcaseProps {
  drinks: TopDrink[];
  isLoading: boolean;
  onDrinkClick: (drink: TopDrink) => void;
}

export function TopDrinksShowcase({ drinks, isLoading, onDrinkClick }: TopDrinksShowcaseProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-32 h-40 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (drinks.length === 0) {
    return null;
  }

  const getTypeIcon = (type: string) => {
    return isBuiltInDrinkType(type) ? drinkTypeIcons[type] : '🍹';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Top Drinks
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {drinks.map((drink) => (
          <Card
            key={drink.id}
            className="w-32 flex-shrink-0 bg-card/50 border-border/50 hover:bg-card hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
            onClick={() => onDrinkClick(drink)}
          >
            {/* Image or Icon */}
            <div className="h-20 bg-muted/50 flex items-center justify-center">
              {drink.imageUrl ? (
                <img
                  src={drink.imageUrl}
                  alt={drink.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">{getTypeIcon(drink.type)}</span>
              )}
            </div>
            
            {/* Content */}
            <div className="p-2.5 space-y-1">
              <p className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
                {drink.name}
              </p>
              
              <div className="flex items-center justify-between">
                <DrinkTypeBadge type={drink.type} size="sm" />
                <span className="text-xs font-medium text-amber-500">
                  {drink.rating}★
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
