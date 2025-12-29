import { cn } from '@/lib/utils';

interface DrinkListItemSkeletonProps {
  style?: React.CSSProperties;
}

export function DrinkListItemSkeleton({ style }: DrinkListItemSkeletonProps) {
  return (
    <div
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl",
        "bg-card/50 border border-border/50",
        "animate-fade-in"
      )}
      style={style}
    >
      {/* Thumbnail skeleton */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shimmer" />
      </div>

      {/* Text skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Name */}
        <div className="h-5 w-3/4 rounded shimmer" />

        {/* Meta row */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 rounded shimmer" />
          <div className="h-5 w-16 rounded-full shimmer" />
          <div className="h-4 w-12 rounded shimmer" />
        </div>

        {/* Notes preview */}
        <div className="h-4 w-full max-w-[200px] rounded shimmer" />
      </div>

      {/* Date skeleton */}
      <div className="flex-shrink-0 hidden sm:block">
        <div className="h-4 w-20 rounded shimmer" />
      </div>
    </div>
  );
}
