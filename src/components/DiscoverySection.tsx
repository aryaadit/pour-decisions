import { TrendingUp, Users, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StorageImage } from '@/components/StorageImage';
import { DrinkTypeBadge } from '@/components/DrinkTypeBadge';
import { PopularDrink } from '@/services/discoveryService';
import { isBuiltInDrinkType, drinkTypeIcons } from '@/types/drink';

interface DiscoverySectionProps {
  circlePopular: PopularDrink[];
  trending: PopularDrink[];
  isLoading: boolean;
  onDrinkClick?: (drink: PopularDrink) => void;
}

export function DiscoverySection({
  circlePopular,
  trending,
  isLoading,
  onDrinkClick,
}: DiscoverySectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-36 h-28 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const hasCircle = circlePopular.length > 0;
  const hasTrending = trending.length > 0;

  if (!hasCircle && !hasTrending) return null;

  return (
    <div className="space-y-5">
      {hasCircle && (
        <DiscoveryRow
          title="Popular in Your Circle"
          icon={<Users className="h-4 w-4 text-primary" />}
          drinks={circlePopular}
          onDrinkClick={onDrinkClick}
        />
      )}
      {hasTrending && (
        <DiscoveryRow
          title="Trending"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          drinks={trending}
          onDrinkClick={onDrinkClick}
        />
      )}
    </div>
  );
}

function DiscoveryRow({
  title,
  icon,
  drinks,
  onDrinkClick,
}: {
  title: string;
  icon: React.ReactNode;
  drinks: PopularDrink[];
  onDrinkClick?: (drink: PopularDrink) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {drinks.map((drink, i) => (
          <DiscoveryCard
            key={`${drink.name}-${i}`}
            drink={drink}
            onClick={onDrinkClick}
          />
        ))}
      </div>
    </div>
  );
}

function DiscoveryCard({
  drink,
  onClick,
}: {
  drink: PopularDrink;
  onClick?: (drink: PopularDrink) => void;
}) {
  const typeIcon = isBuiltInDrinkType(drink.type)
    ? drinkTypeIcons[drink.type]
    : '🍹';

  return (
    <Card
      className="w-36 flex-shrink-0 bg-card/50 border-border/50 overflow-hidden cursor-pointer active:opacity-75 transition-opacity"
      onClick={() => onClick?.(drink)}
    >
      {/* Thumbnail */}
      <div className="h-16 bg-muted/50 flex items-center justify-center">
        {drink.sampleImage ? (
          <StorageImage
            storagePath={drink.sampleImage}
            alt={drink.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl">{typeIcon}</span>
        )}
      </div>

      <div className="p-2 space-y-1">
        <p className="font-medium text-xs text-foreground line-clamp-1">
          {drink.name}
        </p>
        <div className="flex items-center justify-between">
          <DrinkTypeBadge type={drink.type} size="sm" />
          <span className="text-[10px] text-muted-foreground font-medium">
            {drink.logCount}x
          </span>
        </div>
        {drink.avgRating && (
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>{drink.avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
