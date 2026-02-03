import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drink, DrinkType, drinkTypeIcons } from '@/types/drink';
import { StarRating } from './StarRating';
import { DrinkTypeBadge } from './DrinkTypeBadge';
import { WishlistToggle } from './WishlistToggle';
import { AddToCollectionModal } from './AddToCollectionModal';
import { StorageImage } from './StorageImage';
import { useCollections } from '@/hooks/useCollections';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { format } from 'date-fns';
import { MapPin, DollarSign, Calendar, X, Pencil, Trash2, ZoomIn, FolderPlus, Folder, Loader2 } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [drinkCollectionIds, setDrinkCollectionIds] = useState<string[]>([]);
  const [fullDrink, setFullDrink] = useState<Drink | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  // Fetch full drink data when modal opens with partial data (from feed/profile)
  useEffect(() => {
    const fetchFullDrink = async () => {
      if (!open || !drink) {
        setFullDrink(null);
        return;
      }

      // Check if we have partial data (missing notes, location, etc.)
      const isPartialData = drink.notes === undefined && drink.location === undefined && drink.price === undefined;
      
      if (isPartialData && drink.id) {
        setIsLoadingFull(true);
        const { data, error } = await supabase
          .from('drinks')
          .select('*')
          .eq('id', drink.id)
          .maybeSingle();

        if (!error && data) {
          setFullDrink({
            id: data.id,
            name: data.name,
            type: data.type as DrinkType,
            brand: data.brand || undefined,
            rating: data.rating || 0,
            notes: data.notes || undefined,
            location: data.location || undefined,
            price: data.price || undefined,
            dateAdded: new Date(data.date_added),
            imageUrl: data.image_url || undefined,
            isWishlist: data.is_wishlist || false,
          });
        } else {
          // Fall back to the partial drink if fetch fails
          setFullDrink(drink);
        }
        setIsLoadingFull(false);
      } else {
        setFullDrink(drink);
      }
    };

    fetchFullDrink();
  }, [open, drink]);

  // Use full drink data if available, otherwise use the passed drink
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

  if (!displayDrink) return null;

  const handleEdit = () => {
    onOpenChange(false);
    onEdit?.(displayDrink);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onOpenChange(false);
    onDelete?.(displayDrink.id);
  };

  // Loading state content
  const loadingContent = (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  // Get signed URL for image preview
  const { signedUrl: imageSignedUrl } = useSignedUrl(displayDrink.imageUrl);

  const content = isLoadingFull ? loadingContent : (
    <div className="space-y-6">
      {/* Image */}
      {displayDrink.imageUrl ? (
        <button
          type="button"
          onClick={() => setShowImagePreview(true)}
          className="relative w-full aspect-video rounded-xl overflow-hidden group cursor-pointer bg-muted/50"
        >
          <StorageImage
            storagePath={displayDrink.imageUrl}
            alt={`Photo of ${displayDrink.name}`}
            className="w-full h-full object-contain"
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">{drinkTypeIcons[displayDrink.type]}</span>
              </div>
            }
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ) : (
        <div className="w-full aspect-video rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-6xl">{drinkTypeIcons[displayDrink.type]}</span>
        </div>
      )}

      {/* Owner Info - shown when viewing from feed/profile */}
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
          <span className="font-medium text-foreground">
            @{owner.username}
          </span>
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

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {displayDrink.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {displayDrink.location}
          </span>
        )}
        {displayDrink.price && (
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            {String(displayDrink.price).replace(/^\$/, '')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {format(displayDrink.dateAdded, 'MMMM d, yyyy')}
        </span>
      </div>

      {/* Actions - hidden in read-only mode */}
      {!readOnly && (
        <div className="flex gap-3 pt-2">
          {onEdit && (
            <Button variant="outline" className="flex-1" onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {displayDrink.isWishlist ? 'Log It' : 'Edit'}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setShowAddToCollection(true)} title="Add to collection">
            <FolderPlus className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button variant="destructive" size="icon" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{displayDrink.name}"?</AlertDialogTitle>
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

  const imagePreviewDialog = displayDrink.imageUrl && showImagePreview && (
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
          <DialogTitle>Photo of {displayDrink.name}</DialogTitle>
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
          {imageSignedUrl && (
            <img
              src={imageSignedUrl}
              alt={`Photo of ${displayDrink.name}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
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
              <DrawerTitle>{displayDrink.name}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4 pb-8 pt-2">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
        {deleteConfirmDialog}
        {imagePreviewDialog}
        {displayDrink && (
          <AddToCollectionModal
            open={showAddToCollection}
            onOpenChange={setShowAddToCollection}
            drinkId={displayDrink.id}
            drinkName={displayDrink.name}
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
      {deleteConfirmDialog}
      {imagePreviewDialog}
      {displayDrink && (
        <AddToCollectionModal
          open={showAddToCollection}
          onOpenChange={setShowAddToCollection}
          drinkId={displayDrink.id}
          drinkName={displayDrink.name}
        />
      )}
    </>
  );
}
