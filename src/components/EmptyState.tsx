import { Wine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  onAddClick: () => void;
  onClearFilters: () => void;
}

export function EmptyState({ hasFilters, onAddClick, onClearFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 animate-float">
          <Wine className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">No drinks found</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          No drinks match your current filters. Try adjusting your search or filter criteria.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {/* Animated illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center glow animate-float">
          <span className="text-5xl">🥃</span>
        </div>
        {/* Sparkle decorations */}
        <Sparkles 
          className="absolute -top-2 -right-2 w-6 h-6 text-primary/60 animate-pulse" 
          style={{ animationDelay: '0.5s' }}
        />
        <Sparkles 
          className="absolute -bottom-1 -left-3 w-4 h-4 text-accent/60 animate-pulse" 
          style={{ animationDelay: '1s' }}
        />
      </div>

      <h3 className="font-display text-2xl font-semibold mb-3 text-gradient">
        Start Your Collection
      </h3>
      <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
        Add your first drink to start tracking your favorites. Keep notes on what you loved and where you found it.
      </p>
      <Button 
        variant="glow" 
        size="lg" 
        onClick={onAddClick}
        className="animate-pulse-glow"
      >
        Add Your First Drink
      </Button>
    </div>
  );
}
