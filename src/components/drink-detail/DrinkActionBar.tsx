import { useState } from 'react';
import { Drink } from '@/types/drink';
import { Pencil, Trash2, FolderPlus } from 'lucide-react';
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

interface DrinkActionBarProps {
  drink: Drink;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddToCollection: () => void;
}

export function DrinkActionBar({ drink, onEdit, onDelete, onAddToCollection }: DrinkActionBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="flex gap-3 pt-2">
        {onEdit && (
          <Button variant="outline" className="flex-1" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={onAddToCollection} title="Add to collection">
          <FolderPlus className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button variant="destructive" size="icon" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

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
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
