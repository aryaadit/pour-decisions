import { Wine } from 'lucide-react';
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
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
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
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 glow">
        <span className="text-4xl">🥃</span>
      </div>
      <h3 className="font-display text-2xl font-semibold mb-2">Start Your Collection</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Add your first drink to start tracking your favorites. Keep notes on what you loved and where you found it.
      </p>
      <Button variant="glow" size="lg" onClick={onAddClick}>
        Add Your First Drink
      </Button>
    </div>
  );
}
