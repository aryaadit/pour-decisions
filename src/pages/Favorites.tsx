import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrinks } from '@/hooks/useDrinks';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrinkType, Drink } from '@/types/drink';
import { SortOrder } from '@/types/profile';
import { DrinkListItem } from '@/components/DrinkListItem';
import { DrinkListItemSkeleton } from '@/components/DrinkListItemSkeleton';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { SearchBar } from '@/components/SearchBar';
import { SortSelector } from '@/components/SortSelector';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Heart, ArrowLeft, Wine } from 'lucide-react';
import { toast } from 'sonner';

const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { drinks, isLoading, updateDrink, deleteDrink, getFavorites, toggleFavorite } = useDrinks();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date_desc');
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const favorites = useMemo(() => getFavorites(), [getFavorites]);

  const filteredFavorites = useMemo(() => {
    let filtered = favorites;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (drink) =>
          drink.name.toLowerCase().includes(query) ||
          drink.brand?.toLowerCase().includes(query) ||
          drink.notes?.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'date_desc':
          return b.dateAdded.getTime() - a.dateAdded.getTime();
        case 'date_asc':
          return a.dateAdded.getTime() - b.dateAdded.getTime();
        case 'rating_desc':
          return b.rating - a.rating;
        case 'rating_asc':
          return a.rating - b.rating;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [favorites, searchQuery, sortOrder]);

  const handleEdit = (drink: Drink) => {
    if (isMobile) {
      navigate(`/add-drink?edit=${drink.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    const drink = drinks.find((d) => d.id === id);
    await deleteDrink(id);
    toast.success('Drink removed', {
      description: `${drink?.name} has been removed from your collection.`,
    });
  };

  const handleToggleFavorite = async (id: string) => {
    const drink = drinks.find((d) => d.id === id);
    const newStatus = await toggleFavorite(id);
    if (newStatus === false) {
      toast.success('Removed from favorites', {
        description: `${drink?.name} has been removed from favorites.`,
      });
    }
  };

  if (authLoading || isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shimmer" />
              <div className="h-6 w-32 rounded shimmer" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="h-10 w-full rounded-lg shimmer mb-4" />
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <DrinkListItemSkeleton key={i} style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              <h1 className="font-display text-xl font-bold text-foreground">Favorites</h1>
            </div>
            <span className="text-sm text-muted-foreground">
              {favorites.length} {favorites.length === 1 ? 'drink' : 'drinks'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {favorites.length > 0 ? (
          <>
            {/* Search and Sort */}
            <div className="flex items-center gap-3 mb-4">
              <SearchBar
                ref={searchInputRef}
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search favorites..."
              />
              <SortSelector value={sortOrder} onChange={setSortOrder} />
            </div>

            {/* Results count */}
            {filteredFavorites.length !== favorites.length && (
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <span>
                  Showing {filteredFavorites.length} of {favorites.length}
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-primary hover:underline text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Favorites List */}
            {filteredFavorites.length > 0 ? (
              <div className="flex flex-col gap-3 max-w-2xl mx-auto">
                {filteredFavorites.map((drink, index) => (
                  <DrinkListItem
                    key={drink.id}
                    drink={drink}
                    onClick={() => setViewingDrink(drink)}
                    onToggleFavorite={handleToggleFavorite}
                    style={{ animationDelay: `${index * 30}ms` }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">No favorites match your search.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-primary hover:underline mt-2"
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <Heart className="h-20 w-20 text-muted-foreground/30" />
              <div className="absolute -top-1 -right-1 animate-pulse">
                <Heart className="h-6 w-6 text-red-500/50 fill-red-500/50" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              No favorites yet
            </h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Tap the heart icon on any drink to save it here for quick access.
            </p>
            <Button variant="glow" onClick={() => navigate('/')}>
              <Wine className="h-4 w-4 mr-2" />
              Browse Drinks
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile only */}
      {isMobile && <BottomNavigation />}

      {/* Detail Modal */}
      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => {
          if (!open) {
            setViewingDrink(null);
          }
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
};

export default Favorites;
