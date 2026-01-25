import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCollections } from '@/hooks/useCollections';
import { DrinkListItem } from '@/components/DrinkListItem';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, Wine, ExternalLink } from 'lucide-react';
import { Drink, Collection } from '@/types/drink';

const SharedCollection = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const { getPublicCollection } = useCollections();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);

  useEffect(() => {
    if (shareId) {
      loadCollection(shareId);
    }
  }, [shareId]);

  const loadCollection = async (id: string) => {
    setIsLoading(true);
    setError(null);

    const result = await getPublicCollection(id);

    if (result) {
      setCollection(result.collection);
      setDrinks(result.drinks);
    } else {
      setError('Collection not found or is private');
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Wine className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-display text-xl font-bold mb-2">Collection Not Found</h1>
        <p className="text-muted-foreground text-center max-w-sm mb-6">
          This collection may be private or no longer exists.
        </p>
        <Link to="/">
          <Button>Go to Pour Decisions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        {/* Color bar */}
        <div className="h-1" style={{ backgroundColor: collection.coverColor }} />

        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: `${collection.coverColor}20` }}
            >
              {collection.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground truncate">
                  {collection.name}
                </h1>
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Shared collection • {drinks.length} drink{drinks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {collection.description && (
            <p className="mt-2 text-sm text-muted-foreground ml-[60px]">
              {collection.description}
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {drinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Wine className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">This collection is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {drinks.map((drink, index) => (
              <DrinkListItem
                key={drink.id}
                drink={drink}
                onClick={() => setViewingDrink(drink)}
                style={{ animationDelay: `${index * 30}ms` }}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center py-8 border-t border-border/50">
          <p className="text-muted-foreground mb-4">
            Track your own drinks with Pour Decisions
          </p>
          <Link to="/">
            <Button variant="glow">
              <ExternalLink className="w-4 h-4 mr-2" />
              Try Pour Decisions
            </Button>
          </Link>
        </div>
      </main>

      {/* Drink Detail Modal - Read-only for public collections */}
      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => !open && setViewingDrink(null)}
        readOnly={true}
      />
    </div>
  );
};

export default SharedCollection;
