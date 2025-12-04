import { useState } from 'react';
import { Drink, drinkTypeIcons } from '@/types/drink';
import { StarRating } from './StarRating';
import { DrinkTypeBadge } from './DrinkTypeBadge';
import { format } from 'date-fns';
import { MapPin, DollarSign, Calendar, X, Pencil, Trash2 } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DrinkDetailModalProps {
  drink: Drink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (drink: Drink) => void;
  onDelete: (id: string) => void;
}

export function DrinkDetailModal({
  drink,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: DrinkDetailModalProps) {
  const isMobile = useIsMobile();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <div className="relative w-full aspect-video rounded-xl overflow-hidden">
          <img
            src={drink.imageUrl}
            alt={`Photo of ${drink.name}`}
            className="w-full h-full object-cover"
          />
        </div>
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
          <DrinkTypeBadge type={drink.type} />
        </div>

        <StarRating rating={drink.rating} readonly size="md" />
      </div>

      {/* Notes */}
      {drink.notes && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Tasting Notes</h3>
          <p className="text-muted-foreground leading-relaxed">{drink.notes}</p>
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
          Edit
        </Button>
        <Button variant="destructive" className="flex-1" onClick={handleDeleteClick}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
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

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{drink.name}</DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="px-4 pb-8 pt-2 max-h-[85vh]">
              {content}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
        {deleteConfirmDialog}
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
    </>
  );
}
