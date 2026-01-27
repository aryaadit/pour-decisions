import { useRef, memo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Drink } from '@/types/drink';
import { MemoizedDrinkListItem } from './MemoizedDrinkListItem';

interface VirtualizedDrinkListProps {
  drinks: Drink[];
  onDrinkClick: (drink: Drink) => void;
  onWishlistToggle: (drinkId: string, isWishlist: boolean) => void;
}

const ITEM_GAP = 12; // Gap between items in pixels

export const VirtualizedDrinkList = memo(function VirtualizedDrinkList({
  drinks,
  onDrinkClick,
  onWishlistToggle,
}: VirtualizedDrinkListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: drinks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110, // Slightly increased base estimate
    overscan: 5,
    gap: ITEM_GAP, // Use built-in gap support
  });

  const items = virtualizer.getVirtualItems();

  const handleClick = useCallback((drink: Drink) => {
    onDrinkClick(drink);
  }, [onDrinkClick]);

  const handleWishlistToggle = useCallback((drinkId: string, isWishlist: boolean) => {
    onWishlistToggle(drinkId, isWishlist);
  }, [onWishlistToggle]);

  if (drinks.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="max-w-2xl mx-auto overflow-auto"
      style={{
        height: 'calc(100vh - 280px)',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const drink = drinks[virtualRow.index];
          return (
            <div
              key={drink.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MemoizedDrinkListItem
                drink={drink}
                onClick={() => handleClick(drink)}
                onWishlistToggle={handleWishlistToggle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
