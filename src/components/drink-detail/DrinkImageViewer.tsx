import { useState } from 'react';
import { Drink, drinkTypeIcons } from '@/types/drink';
import { StorageImage } from '@/components/StorageImage';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { ZoomIn, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DrinkImageViewerProps {
  drink: Drink;
}

export function DrinkImageViewer({ drink }: DrinkImageViewerProps) {
  const [showPreview, setShowPreview] = useState(false);
  const { signedUrl } = useSignedUrl(drink.imageUrl);

  const handleClose = () => setShowPreview(false);

  return (
    <>
      {drink.imageUrl ? (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="relative w-full aspect-video rounded-xl overflow-hidden group cursor-pointer bg-muted/50"
        >
          <StorageImage
            storagePath={drink.imageUrl}
            alt={`Photo of ${drink.name}`}
            className="w-full h-full object-contain"
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">{drinkTypeIcons[drink.type]}</span>
              </div>
            }
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

      {drink.imageUrl && showPreview && (
        <Dialog
          open={true}
          onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}
          modal={true}
        >
          <DialogContent
            className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none"
            onPointerDownOutside={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
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
                handleClose();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex items-center justify-center p-4">
              {signedUrl && (
                <img
                  src={signedUrl}
                  alt={`Photo of ${drink.name}`}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
