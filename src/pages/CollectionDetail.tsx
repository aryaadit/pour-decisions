import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useDrinks } from '@/hooks/useDrinks';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrinkListItem } from '@/components/MemoizedDrinkListItem';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { StorageImage } from '@/components/StorageImage';
import { PullToRefresh } from '@/components/PullToRefresh';

import { Button } from '@/components/ui/button';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Settings, Globe, Lock, Plus, Loader2, Wine } from 'lucide-react';
import { Drink, Collection } from '@/types/drink';
import { toast } from 'sonner';

const CollectionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { collections, getCollectionDrinks, addDrinkToCollection, removeDrinkFromCollection, refetch } = useCollections();
  const { drinks: allDrinks } = useDrinks();
  const isMobile = useIsMobile();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [collectionDrinks, setCollectionDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);
  const [showAddDrinksDialog, setShowAddDrinksDialog] = useState(false);
  const [selectedDrinkIds, setSelectedDrinkIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (id && collections.length > 0) {
      const found = collections.find((c) => c.id === id);
      if (found) {
        setCollection(found);
        loadDrinks(id);
      } else {
        // Collection not found
        toast.error('Collection not found');
        navigate('/collections');
      }
    }
  }, [id, collections, user, authLoading, navigate]);

  const loadDrinks = async (collectionId: string) => {
    setIsLoading(true);
    const drinks = await getCollectionDrinks(collectionId);
    setCollectionDrinks(drinks);
    setSelectedDrinkIds(new Set(drinks.map((d) => d.id)));
    setIsLoading(false);
  };

  const handleEditDrink = (drink: Drink) => {
    navigate(`/add-drink?edit=${drink.id}`);
  };

  const handleDeleteDrink = async (drinkId: string) => {
    // This removes from collection, not deletes the drink
    if (!collection) return;
    const success = await removeDrinkFromCollection(collection.id, drinkId);
    if (success) {
      setCollectionDrinks((prev) => prev.filter((d) => d.id !== drinkId));
      toast.success('Removed from collection');
    }
  };

  const handleToggleDrinkInCollection = (drinkId: string) => {
    setSelectedDrinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(drinkId)) {
        next.delete(drinkId);
      } else {
        next.add(drinkId);
      }
      return next;
    });
  };

  const handleSaveDrinksSelection = async () => {
    if (!collection) return;

    const currentDrinkIds = new Set(collectionDrinks.map((d) => d.id));
    const toAdd = [...selectedDrinkIds].filter((id) => !currentDrinkIds.has(id));
    const toRemove = [...currentDrinkIds].filter((id) => !selectedDrinkIds.has(id));

    await Promise.all([
      ...toAdd.map((id) => addDrinkToCollection(collection.id, id)),
      ...toRemove.map((id) => removeDrinkFromCollection(collection.id, id)),
    ]);

    await loadDrinks(collection.id);
    setShowAddDrinksDialog(false);
    toast.success('Collection updated');
  };

  const handleRefresh = async () => {
    refetch();
    if (id) await loadDrinks(id);
  };

  if (!collection || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
          <div className="h-1 shimmer" />
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg shimmer" />
              <div className="w-10 h-10 rounded-lg shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 rounded shimmer" />
                <div className="h-3 w-20 rounded shimmer" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-12 h-12 rounded-lg shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 rounded shimmer" />
                  <div className="h-4 w-1/2 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        </main>
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/collections')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${collection.coverColor}20` }}
            >
              {collection.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-foreground truncate">
                  {collection.name}
                </h1>
                {collection.isPublic ? (
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {collectionDrinks.length} drink{collectionDrinks.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Button variant="ghost" size="icon" onClick={() => navigate(`/collections/${collection.id}/settings`)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {collection.description && (
            <p className="mt-2 text-sm text-muted-foreground ml-[60px]">
              {collection.description}
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-full flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-12 h-12 rounded-lg shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 rounded shimmer" />
                  <div className="h-4 w-1/2 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : collectionDrinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Wine className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="font-display text-lg font-semibold">No drinks yet</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Add drinks to this collection to keep them organized
              </p>
            </div>
            <Button onClick={() => setShowAddDrinksDialog(true)} variant="glow">
              <Plus className="w-4 h-4 mr-2" />
              Add Drinks
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <Button variant="outline" onClick={() => setShowAddDrinksDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Drinks
              </Button>
            </div>
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {collectionDrinks.map((drink, index) => (
                <DrinkListItem
                  key={drink.id}
                  drink={drink}
                  onClick={() => setViewingDrink(drink)}
                  style={{ animationDelay: `${index * 30}ms` }}
                />
              ))}
            </div>
          </>
        )}
      </main>
      </PullToRefresh>

      {/* Detail Modal */}
      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => !open && setViewingDrink(null)}
        onEdit={handleEditDrink}
        onDelete={handleDeleteDrink}
      />

      {/* Add Drinks Bottom Sheet */}
      <Drawer open={showAddDrinksDialog} onOpenChange={setShowAddDrinksDialog}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Add Drinks to Collection</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4">
            {allDrinks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No drinks in your library yet
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {allDrinks.map((drink) => (
                  <label
                    key={drink.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedDrinkIds.has(drink.id)}
                      onCheckedChange={() => handleToggleDrinkInCollection(drink.id)}
                    />
                    {drink.imageUrl ? (
                      <StorageImage
                        storagePath={drink.imageUrl}
                        alt={drink.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                        🍹
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{drink.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {drink.brand || drink.type}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 p-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDrinksDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveDrinksSelection} className="flex-1">
              Save
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Spacer for bottom nav */}
      {isMobile && <div className="h-20" />}
    </div>
  );
};

export default CollectionDetail;
