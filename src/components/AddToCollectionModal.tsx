import { useState, useEffect } from 'react';
import { useCollections } from '@/hooks/useCollections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Plus, Loader2, FolderPlus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptics } from '@/hooks/useHaptics';
import { toast } from 'sonner';

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drinkId: string;
  drinkName: string;
}

export function AddToCollectionModal({
  open,
  onOpenChange,
  drinkId,
  drinkName,
}: AddToCollectionModalProps) {
  const isMobile = useIsMobile();
  const { impact, notification, ImpactStyle, NotificationType } = useHaptics();
  const {
    collections,
    isLoading,
    createCollection,
    addDrinkToCollection,
    removeDrinkFromCollection,
    getDrinkCollections,
  } = useCollections();

  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [initialCollections, setInitialCollections] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && drinkId) {
      getDrinkCollections(drinkId).then((collectionIds) => {
        const set = new Set(collectionIds);
        setSelectedCollections(set);
        setInitialCollections(set);
      });
    }
  }, [open, drinkId, getDrinkCollections]);

  const handleToggleCollection = (collectionId: string) => {
    impact(ImpactStyle.Light);
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setIsSaving(true);
    const collection = await createCollection(newCollectionName.trim());
    setIsSaving(false);

    if (collection) {
      notification(NotificationType.Success);
      setSelectedCollections((prev) => new Set(prev).add(collection.id));
      setNewCollectionName('');
      setIsCreating(false);
      toast.success(`Created "${collection.name}"`);
    } else {
      toast.error('Failed to create collection');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Find added and removed collections
    const toAdd = [...selectedCollections].filter((id) => !initialCollections.has(id));
    const toRemove = [...initialCollections].filter((id) => !selectedCollections.has(id));

    // Process changes
    await Promise.all([
      ...toAdd.map((id) => addDrinkToCollection(id, drinkId)),
      ...toRemove.map((id) => removeDrinkFromCollection(id, drinkId)),
    ]);

    setIsSaving(false);
    notification(NotificationType.Success);

    const addedCount = toAdd.length;
    const removedCount = toRemove.length;

    if (addedCount > 0 && removedCount > 0) {
      toast.success(`Updated collections for "${drinkName}"`);
    } else if (addedCount > 0) {
      toast.success(`Added to ${addedCount} collection${addedCount > 1 ? 's' : ''}`);
    } else if (removedCount > 0) {
      toast.success(`Removed from ${removedCount} collection${removedCount > 1 ? 's' : ''}`);
    }

    onOpenChange(false);
  };

  const content = (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : collections.length === 0 && !isCreating ? (
        <div className="text-center py-8 space-y-4">
          <FolderPlus className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-muted-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground/70">
              Create your first collection to organize drinks
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Collection
          </Button>
        </div>
      ) : (
        <>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleToggleCollection(collection.id)}
                >
                  <Checkbox
                    checked={selectedCollections.has(collection.id)}
                    onCheckedChange={() => handleToggleCollection(collection.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xl">{collection.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{collection.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {collection.drinkCount || 0} drink{collection.drinkCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {isCreating ? (
            <div className="flex gap-2 items-end border-t pt-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="new-collection">New collection name</Label>
                <Input
                  id="new-collection"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Summer Favorites"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCollection();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || isSaving}
                size="sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewCollectionName('');
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create new collection
            </Button>
          )}
        </>
      )}
    </div>
  );

  const footer = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isSaving} className="flex-1">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add to Collection</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
