import { useState, useEffect } from 'react';
import { Drink, drinkTypeIcons } from '@/types/drink';
import { StarRating } from './StarRating';
import { DrinkTypeBadge } from './DrinkTypeBadge';
import { WishlistToggle } from './WishlistToggle';
import { AddToCollectionModal } from './AddToCollectionModal';
import { useCollections } from '@/hooks/useCollections';
import { format } from 'date-fns';
import { MapPin, DollarSign, Calendar, X, Pencil, Trash2, ZoomIn, FolderPlus, Folder } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DrinkDetailModalProps {
  drink: Drink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (drink: Drink) => void;
  onDelete: (id: string) => void;
  onWishlistToggle?: (drinkId: string, isWishlist: boolean) => void;
}

export function DrinkDetailModal({
  drink,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onWishlistToggle,
}: DrinkDetailModalProps) {
  const isMobile = useIsMobile();
  const { collections, getDrinkCollections } = useCollections();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [drinkCollectionIds, setDrinkCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && drink) {
      getDrinkCollections(drink.id).then(setDrinkCollectionIds);
    }
  }, [open, drink, getDrinkCollections]);

  // Refetch collections when AddToCollection modal closes
  useEffect(() => {
    if (!showAddToCollection && open && drink) {
      getDrinkCollections(drink.id).then(setDrinkCollectionIds);
    }
  }, [showAddToCollection, open, drink, getDrinkCollections]);

  const drinkCollections = collections.filter((c) => drinkCollectionIds.includes(c.id));

  if (!drink) return null;

  const handleEdit = () => {
    onOpenChange(false);
    onEdit(drink);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onOpenChange(false);
    onDelete(drink.id);
  };

  const content = (
    <div className="space-y-6">
      {/* Image */}
      {drink.imageUrl ? (
        <button
          type="button"
          onClick={() => setShowImagePreview(true)}
          className="relative w-full aspect-video rounded-xl overflow-hidden group cursor-pointer bg-muted/50"
        >
          <img
            src={drink.imageUrl}
            alt={`Photo of ${drink.name}`}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ) : (
        <div className="w-full aspect-video rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-6xl">{drinkTypeIcons[drink.type]}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {drink.name}
            </h2>
            {drink.brand && (
              <p className="text-muted-foreground">{drink.brand}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onWishlistToggle && (
              <WishlistToggle
                isWishlist={drink.isWishlist || false}
                onToggle={(isWishlist) => onWishlistToggle(drink.id, isWishlist)}
              />
            )}
            <DrinkTypeBadge type={drink.type} />
          </div>
        </div>

        {drink.isWishlist ? (
          <p className="text-sm text-orange-500 italic">Want to try this drink</p>
        ) : (
          <StarRating rating={drink.rating} readonly size="md" />
        )}
      </div>

      {/* Notes */}
      {drink.notes && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Tasting Notes</h3>
          <p className="text-muted-foreground leading-relaxed">{drink.notes}</p>
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
                className="text-xs"
              >
                <span className="mr-1">{collection.icon}</span>
                {collection.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {drink.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {drink.location}
          </span>
        )}
        {drink.price && (
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            {String(drink.price).replace(/^\$/, '')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {format(drink.dateAdded, 'MMMM d, yyyy')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          {drink.isWishlist ? 'Log It' : 'Edit'}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowAddToCollection(true)} title="Add to collection">
          <FolderPlus className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{drink.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove this drink from your collection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const handleImagePreviewClose = () => {
    setShowImagePreview(false);
  };

  const imagePreviewDialog = drink.imageUrl && showImagePreview && (
    <Dialog 
      open={true} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleImagePreviewClose();
        }
      }}
      modal={true}
    >
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none"
        onPointerDownOutside={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleImagePreviewClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleImagePreviewClose();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Photo of {drink.name}</DialogTitle>
        </DialogHeader>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            handleImagePreviewClose();
          }}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center justify-center p-4">
          <img
            src={drink.imageUrl}
            alt={`Photo of ${drink.name}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{drink.name}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4 pb-8 pt-2">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
        {deleteConfirmDialog}
        {imagePreviewDialog}
        {drink && (
          <AddToCollectionModal
            open={showAddToCollection}
            onOpenChange={setShowAddToCollection}
            drinkId={drink.id}
            drinkName={drink.name}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{drink.name}</DialogTitle>
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
      {deleteConfirmDialog}
      {imagePreviewDialog}
      {drink && (
        <AddToCollectionModal
          open={showAddToCollection}
          onOpenChange={setShowAddToCollection}
          drinkId={drink.id}
          drinkName={drink.name}
        />
      )}
    </>
  );
}
