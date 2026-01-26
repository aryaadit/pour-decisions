import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useDrinks } from '@/hooks/useDrinks';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrinkListItem } from '@/components/DrinkListItem';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, MoreVertical, Pencil, Trash2, Globe, Lock, Share2, Plus, Loader2, Wine } from 'lucide-react';
import { Drink, Collection } from '@/types/drink';
import { toast } from 'sonner';

const CollectionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { collections, updateCollection, deleteCollection, togglePublic, getCollectionDrinks, addDrinkToCollection, removeDrinkFromCollection, refetch } = useCollections();
  const { drinks: allDrinks } = useDrinks();
  const isMobile = useIsMobile();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [collectionDrinks, setCollectionDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
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

  const handleEditSave = async (name: string, description?: string, icon?: string, coverColor?: string) => {
    if (!collection) return null;

    const success = await updateCollection(collection.id, {
      name,
      description,
      icon,
      coverColor,
    });

    if (success) {
      toast.success('Collection updated');
      refetch();
      return collection;
    } else {
      toast.error('Failed to update collection');
      return null;
    }
  };

  const handleDelete = async () => {
    if (!collection) return;

    const success = await deleteCollection(collection.id);
    if (success) {
      toast.success('Collection deleted');
      navigate('/collections');
    } else {
      toast.error('Failed to delete collection');
    }
  };

  const handleTogglePublic = async () => {
    if (!collection) return;

    const success = await togglePublic(collection.id);
    if (success) {
      toast.success(collection.isPublic ? 'Collection is now private' : 'Collection is now public');
      refetch();
    } else {
      toast.error('Failed to update sharing');
    }
  };

  const handleCopyShareLink = () => {
    if (!collection) return;
    const shareUrl = `${window.location.origin}/share/${collection.shareId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!');
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

  if (!collection || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!collection.isSystem && (
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleTogglePublic}>
                  {collection.isPublic ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Make Public
                    </>
                  )}
                </DropdownMenuItem>
                {collection.isPublic && (
                  <DropdownMenuItem onClick={handleCopyShareLink}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy Share Link
                  </DropdownMenuItem>
                )}
                {!collection.isSystem && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Collection
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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

      {/* Detail Modal */}
      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => !open && setViewingDrink(null)}
        onEdit={handleEditDrink}
        onDelete={handleDeleteDrink}
      />

      {/* Edit Collection Dialog */}
      <CreateCollectionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleEditSave}
        editCollection={collection}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{collection.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the collection. The drinks in this collection will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Drinks Dialog */}
      <Dialog open={showAddDrinksDialog} onOpenChange={setShowAddDrinksDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Drinks to Collection</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
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
                      <img
                        src={drink.imageUrl}
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
          </ScrollArea>
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDrinksDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveDrinksSelection} className="flex-1">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spacer for bottom nav */}
      {isMobile && <div className="h-20" />}
    </div>
  );
};

export default CollectionDetail;
