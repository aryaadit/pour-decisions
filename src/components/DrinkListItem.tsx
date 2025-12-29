import { Drink, drinkTypeIcons, drinkTypeLabels } from '@/types/drink';
import { StarRating } from './StarRating';
import { FavoriteButton } from './FavoriteButton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DrinkListItemProps {
  drink: Drink;
  onClick?: () => void;
  onToggleFavorite?: (id: string) => void;
  style?: React.CSSProperties;
}

export function DrinkListItem({ drink, onClick, onToggleFavorite, style }: DrinkListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl",
        "bg-card/50 border border-border/50",
        "hover:bg-card hover:border-primary/30 hover:shadow-glow",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
        "transition-all duration-300 cursor-pointer",
        "animate-fade-in text-left",
        "card-hover gradient-border",
        "active:scale-[0.98]"
      )}
      style={style}
      aria-label={`View details for ${drink.name}`}
    >
      {/* Thumbnail / Icon */}
      <div className="flex-shrink-0">
        {drink.imageUrl ? (
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={drink.imageUrl}
              alt={`Photo of ${drink.name}`}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary/10 flex items-center justify-center text-2xl transition-all duration-300 hover:bg-primary/20 hover:scale-105">
            {drinkTypeIcons[drink.type]}
          </div>
        )}
      </div>

      {/* Middle Text Section */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name row with favorite button */}
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">
            {drink.name}
          </h3>
          {onToggleFavorite && (
            <FavoriteButton
              isFavorite={drink.isFavorite || false}
              onToggle={() => onToggleFavorite(drink.id)}
              size="sm"
            />
          )}
        </div>

        {/* Meta: Rating, Type Badge, Price */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <StarRating rating={drink.rating} readonly size="sm" animated />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground transition-colors duration-300">
            {drinkTypeLabels[drink.type]}
          </span>
          {drink.price && (
            <span className="text-xs text-muted-foreground">
              {String(drink.price).startsWith('$') ? drink.price : `$${drink.price}`}
            </span>
          )}
        </div>

        {/* Notes Preview */}
        {drink.notes && (
          <p className="text-xs sm:text-sm text-muted-foreground/80 truncate max-w-[280px] sm:max-w-none">
            {drink.notes}
          </p>
        )}
      </div>

      {/* Right Date Section */}
      <div className="flex-shrink-0 hidden sm:block">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(drink.dateAdded, 'MMM d, yyyy')}
        </span>
      </div>
    </button>
  );
}
