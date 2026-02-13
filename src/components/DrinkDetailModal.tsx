import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drink } from '@/types/drink';
import { StarRating } from './StarRating';
import { DrinkTypeBadge } from './DrinkTypeBadge';
import { WishlistToggle } from './WishlistToggle';
import { AddToCollectionModal } from './AddToCollectionModal';
import { DrinkImageViewer } from './drink-detail/DrinkImageViewer';
import { DrinkMetadata } from './drink-detail/DrinkMetadata';
import { DrinkActionBar } from './drink-detail/DrinkActionBar';
import { useCollections } from '@/hooks/useCollections';
import { fetchDrinkById } from '@/services/drinkService';
import { X, Folder, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DrinkOwner {
  username: string;
  displayName?: string | null;
}

interface DrinkDetailModalProps {
  drink: Drink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (drink: Drink) => void;
  onDelete?: (id: string) => void;
  onWishlistToggle?: (drinkId: string, isWishlist: boolean) => void;
  readOnly?: boolean;
  owner?: DrinkOwner | null;
}

export function DrinkDetailModal({
  drink,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onWishlistToggle,
  readOnly = false,
  owner,
}: DrinkDetailModalProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { collections, getDrinkCollections } = useCollections();
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [drinkCollectionIds, setDrinkCollectionIds] = useState<string[]>([]);
  const [fullDrink, setFullDrink] = useState<Drink | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  // Fetch full drink data when modal opens with partial data (from feed/profile)
  useEffect(() => {
    const loadFullDrink = async () => {
      if (!open || !drink) {
        setFullDrink(null);
        return;
      }

      const isPartialData = drink.notes === undefined && drink.location === undefined && drink.price === undefined;

      if (isPartialData && drink.id) {
        setIsLoadingFull(true);
        try {
          const data = await fetchDrinkById(drink.id);
          setFullDrink(data || drink);
        } catch {
          setFullDrink(drink);
        }
        setIsLoadingFull(false);
      } else {
        setFullDrink(drink);
      }
    };

    loadFullDrink();
  }, [open, drink]);

  const displayDrink = fullDrink || drink;

  useEffect(() => {
    if (open && displayDrink) {
      getDrinkCollections(displayDrink.id).then(setDrinkCollectionIds);
    }
  }, [open, displayDrink, getDrinkCollections]);

  // Refetch collections when AddToCollection modal closes
  useEffect(() => {
    if (!showAddToCollection && open && displayDrink) {
      getDrinkCollections(displayDrink.id).then(setDrinkCollectionIds);
    }
  }, [showAddToCollection, open, displayDrink, getDrinkCollections]);

  const drinkCollections = collections.filter((c) => drinkCollectionIds.includes(c.id));

  const handleEdit = () => {
    if (!displayDrink) return;
    onOpenChange(false);
    onEdit?.(displayDrink);
  };

  const handleConfirmDelete = () => {
    if (!displayDrink) return;
    onOpenChange(false);
    onDelete?.(displayDrink.id);
  };

  if (!displayDrink) return null;

  const content = isLoadingFull ? (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ) : (
    <div className="space-y-6">
      <DrinkImageViewer drink={displayDrink} />

      {/* Owner Info */}
      {owner && (
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            navigate(`/u/${owner.username}`);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Logged by</span>
          <span className="font-medium text-foreground">@{owner.username}</span>
        </button>
      )}

      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {displayDrink.name}
            </h2>
            {displayDrink.brand && (
              <p className="text-muted-foreground">{displayDrink.brand}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onWishlistToggle && (
              <WishlistToggle
                isWishlist={displayDrink.isWishlist || false}
                onToggle={(isWishlist) => onWishlistToggle(displayDrink.id, isWishlist)}
              />
            )}
            <DrinkTypeBadge type={displayDrink.type} />
          </div>
        </div>

        {displayDrink.isWishlist ? (
          <p className="text-sm text-orange-500 italic">Want to try this drink</p>
        ) : (
          <StarRating rating={displayDrink.rating} readonly size="md" />
        )}
      </div>

      {/* Notes */}
      {displayDrink.notes && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Tasting Notes</h3>
          <p className="text-muted-foreground leading-relaxed">{displayDrink.notes}</p>
        </div>
      )}

      {/* Collections */}
      {drinkCollections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Folder className="h-4 w-4" />
            Collections
          </h3>
          <div className="flex flex-wrap gap-2">
            {drinkCollections.map((collection) => (
              <Badge
                key={collection.id}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-secondary/80 active:scale-95 transition-all"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/collections/${collection.id}`);
                }}
              >
                <span className="mr-1">{collection.icon}</span>
                {collection.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <DrinkMetadata drink={displayDrink} />

      {!readOnly && (
        <DrinkActionBar
          drink={displayDrink}
          onEdit={onEdit ? handleEdit : undefined}
          onDelete={onDelete ? handleConfirmDelete : undefined}
          onAddToCollection={() => setShowAddToCollection(true)}
        />
      )}
    </div>
  );

  const addToCollectionModal = displayDrink && (
    <AddToCollectionModal
      open={showAddToCollection}
      onOpenChange={setShowAddToCollection}
      drinkId={displayDrink.id}
      drinkName={displayDrink.name}
    />
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{displayDrink.name}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4 pb-8 pt-2">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
        {addToCollectionModal}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{displayDrink.name}</DialogTitle>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 bg-background/80 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <ScrollArea className="p-6 max-h-[85vh]">
            {content}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {addToCollectionModal}
    </>
  );
}
