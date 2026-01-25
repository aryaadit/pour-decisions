import { Collection } from '@/types/drink';
import { cn } from '@/lib/utils';
import { Globe, Lock, Star } from 'lucide-react';

interface CollectionCardProps {
  collection: Collection;
  onClick?: () => void;
}

export function CollectionCard({ collection, onClick }: CollectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl text-left",
        "bg-card/50 border border-border/50",
        "hover:bg-card hover:border-primary/30 hover:shadow-glow",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
        "transition-all duration-300 cursor-pointer",
        "animate-fade-in",
        "card-hover gradient-border",
        "active:scale-[0.98]"
      )}
    >
      {/* Color bar at top */}
      <div
        className="h-1 -mt-4 -mx-4 mb-3 rounded-t-xl"
        style={{ backgroundColor: collection.coverColor }}
      />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${collection.coverColor}20` }}
        >
          {collection.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-foreground truncate">
              {collection.name}
            </h3>
            {collection.isSystem && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/50 flex-shrink-0" />
            )}
            {collection.isPublic ? (
              <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          {collection.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {collection.description}
            </p>
          )}

          <p className="text-xs text-muted-foreground/70">
            {collection.drinkCount || 0} drink{collection.drinkCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </button>
  );
}
