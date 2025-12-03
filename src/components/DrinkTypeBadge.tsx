import { DrinkType, drinkTypeLabels, drinkTypeIcons } from '@/types/drink';
import { cn } from '@/lib/utils';

interface DrinkTypeBadgeProps {
  type: DrinkType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

const typeClasses: Record<DrinkType, string> = {
  whiskey: 'bg-whiskey/20 text-whiskey border-whiskey/30',
  beer: 'bg-beer/20 text-beer border-beer/30',
  wine: 'bg-wine/20 text-wine border-wine/30',
  cocktail: 'bg-cocktail/20 text-cocktail border-cocktail/30',
  other: 'bg-other/20 text-other border-other/30',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function DrinkTypeBadge({ type, size = 'sm', showIcon = true }: DrinkTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        typeClasses[type],
        sizeClasses[size]
      )}
    >
      {showIcon && <span>{drinkTypeIcons[type]}</span>}
      <span>{drinkTypeLabels[type]}</span>
    </span>
  );
}
