import { useRef, memo, useCallback, useEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Drink } from '@/types/drink';
import { MemoizedDrinkListItem } from './MemoizedDrinkListItem';
import { Loader2 } from 'lucide-react';

interface VirtualizedDrinkListProps {
  drinks: Drink[];
  onDrinkClick: (drink: Drink) => void;
  onWishlistToggle: (drinkId: string, isWishlist: boolean) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

const ITEM_GAP = 12;
const LOAD_MORE_THRESHOLD = 5;

export const VirtualizedDrinkList = memo(function VirtualizedDrinkList({
  drinks,
  onDrinkClick,
  onWishlistToggle,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: VirtualizedDrinkListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: drinks.length,
    estimateSize: () => 110,
    overscan: 5,
    gap: ITEM_GAP,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const items = virtualizer.getVirtualItems();

  // Infinite scroll: check if we need to load more
  useEffect(() => {
    if (!onLoadMore || !hasNextPage || isFetchingNextPage) return;

    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= drinks.length - LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  }, [items, drinks.length, hasNextPage, isFetchingNextPage, onLoadMore]);

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
    <div ref={listRef} className="max-w-2xl mx-auto pb-20">
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
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
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

      {/* Loading indicator for infinite scroll */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
        </div>
      )}
    </div>
  );
});
