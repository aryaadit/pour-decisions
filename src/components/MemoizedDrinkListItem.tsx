import { memo } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { Drink, drinkTypeIcons, drinkTypeLabels } from '@/types/drink';
import { StarRating } from '@/components/StarRating';
import { StorageImage } from '@/components/StorageImage';
import { cn } from '@/lib/utils';

interface MemoizedDrinkListItemProps {
  drink: Drink;
  onClick: () => void;
  onWishlistToggle?: (drinkId: string, isWishlist: boolean) => void;
  style?: React.CSSProperties;
}

export const MemoizedDrinkListItem = memo(function MemoizedDrinkListItem({ 
  drink, 
  onClick, 
  onWishlistToggle, 
  style 
}: MemoizedDrinkListItemProps) {
  return (
    <div
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl relative",
        "bg-card/50 border border-border/50",
        "hover:bg-card hover:border-primary/30 hover:shadow-glow",
        "transition-all duration-300 cursor-pointer",
        "animate-fade-in text-left",
        "card-hover gradient-border",
        drink.isWishlist && "border-primary/30 bg-primary/5"
      )}
      style={style}
    >
      {/* Wishlist indicator */}
      {drink.isWishlist && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-orange-500 pointer-events-none">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Want to try</span>
        </div>
      )}
      
      {/* Clickable area */}
      <button
        onClick={onClick}
        className="absolute inset-0 z-0 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background rounded-xl transition-all duration-300 active:scale-[0.98]"
        aria-label={`View details for ${drink.name}`}
      />
      
      {/* Thumbnail / Icon */}
      <div className="flex-shrink-0 relative z-10 pointer-events-none">
        {drink.imageUrl ? (
          <div className="relative overflow-hidden rounded-lg">
            <StorageImage
              storagePath={drink.imageUrl}
              alt={`Photo of ${drink.name}`}
              loading="lazy"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
              fallback={
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                  {drinkTypeIcons[drink.type]}
                </div>
              }
            />
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary/10 flex items-center justify-center text-2xl transition-all duration-300 hover:bg-primary/20 hover:scale-105">
            {drinkTypeIcons[drink.type]}
          </div>
        )}
      </div>

      {/* Middle Text Section */}
      <div className="flex-1 min-w-0 space-y-1 z-10 pointer-events-none">
        {/* Name */}
        <h3 className="font-display text-base sm:text-lg font-semibold text-foreground truncate">
          {drink.name}
        </h3>

        {/* Meta: Rating, Type Badge, Price */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!drink.isWishlist && drink.rating && (
            <StarRating rating={drink.rating} readonly size="sm" animated />
          )}
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

      {/* Right Section - Date */}
      <div className="flex-shrink-0 flex items-center gap-2 z-10">
        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
          {format(drink.dateAdded, 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.drink.id === nextProps.drink.id &&
    prevProps.drink.name === nextProps.drink.name &&
    prevProps.drink.rating === nextProps.drink.rating &&
    prevProps.drink.isWishlist === nextProps.drink.isWishlist &&
    prevProps.drink.imageUrl === nextProps.drink.imageUrl &&
    prevProps.drink.notes === nextProps.drink.notes &&
    prevProps.drink.type === nextProps.drink.type &&
    prevProps.drink.price === nextProps.drink.price
  );
});
