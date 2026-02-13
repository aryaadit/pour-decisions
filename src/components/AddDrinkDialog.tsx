import { useState, useEffect, useRef, useCallback } from 'react';
import { Drink, DrinkType, builtInDrinkTypes, drinkTypeLabels, drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptics } from '@/hooks/useHaptics';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import * as drinkService from '@/services/drinkService';
import { DrinkImageUploader } from '@/components/drink-form/DrinkImageUploader';
import { LookupResultsPanel, LookupInfo } from '@/components/drink-form/LookupResultsPanel';
import { DrinkDetailsForm } from '@/components/drink-form/DrinkDetailsForm';
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

interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (drink: Omit<Drink, 'id' | 'dateAdded'>) => void;
  editDrink?: Drink | null;
  defaultType?: DrinkType;
}

export function AddDrinkDialog({ open, onOpenChange, onSave, editDrink, defaultType = 'whiskey' }: AddDrinkDialogProps) {
  const isMobile = useIsMobile();
  const { impact, notification, ImpactStyle, NotificationType } = useHaptics();
  const { customTypes } = useCustomDrinkTypes();
  const [name, setName] = useState('');
  const [type, setType] = useState<DrinkType>('whiskey');
  const [brand, setBrand] = useState('');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isWishlist, setIsWishlist] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<LookupInfo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const prevOpenRef = useRef(false);
  const isCameraActiveRef = useRef(false);

  useEffect(() => {
    if (isCameraActiveRef.current) return;

    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened) {
      if (editDrink) {
        setName(editDrink.name);
        setType(editDrink.type);
        setBrand(editDrink.brand || '');
        setRating(editDrink.rating);
        setNotes(editDrink.notes || '');
        setLocation(editDrink.location || '');
        setPrice(editDrink.price || '');
        setImageUrl(editDrink.imageUrl);
        setIsWishlist(editDrink.isWishlist || false);
        setDetailsOpen(!!(editDrink.brand || editDrink.notes || editDrink.location || editDrink.price));
      } else {
        setName('');
        setType(defaultType);
        setBrand('');
        setRating(3);
        setNotes('');
        setLocation('');
        setPrice('');
        setImageUrl(undefined);
        setIsWishlist(false);
        setDetailsOpen(false);
      }
    }
  }, [editDrink, open, defaultType]);

  const resetForm = useCallback(() => {
    setName('');
    setType(defaultType);
    setBrand('');
    setRating(3);
    setNotes('');
    setLocation('');
    setPrice('');
    setImageUrl(undefined);
    setIsWishlist(false);
    setLookupInfo(null);
    setDetailsOpen(false);
  }, [defaultType]);

  const handleLookup = async (useImage = false) => {
    const hasName = name.trim();
    const hasImage = useImage && imageUrl;

    if (!hasName && !hasImage) {
      toast.error('Enter a drink name or add a photo first');
      return;
    }

    impact(ImpactStyle.Light);
    setIsLookingUp(true);
    setLookupInfo(null);

    try {
      const data = await drinkService.lookupDrink({
        drinkName: hasName ? name.trim() : undefined,
        drinkType: type,
        brand: brand.trim() || undefined,
        imageUrl: hasImage ? imageUrl : undefined,
      });

      if (data?.success && data?.data) {
        notification(NotificationType.Success);
        const info = data.data;
        setLookupInfo(info);

        if (useImage) {
          if (info.drinkName && !name.trim()) setName(info.drinkName);
          if (info.drinkBrand && !brand.trim()) setBrand(info.drinkBrand);
          if (info.drinkType) setType(info.drinkType);
        }

        toast.success(useImage ? 'Identified drink from photo!' : 'Found drink information!');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Failed to look up drink info');
    } finally {
      setIsLookingUp(false);
    }
  };

  const applyLookupInfo = (field: 'notes' | 'price' | 'all') => {
    if (!lookupInfo) return;

    if (field === 'notes' || field === 'all') {
      const combinedNotes = [
        lookupInfo.tastingNotes,
        lookupInfo.brandInfo,
        lookupInfo.suggestions,
      ].filter(Boolean).join('\n\n');
      if (combinedNotes) setNotes(combinedNotes);
    }

    if (field === 'price' || field === 'all') {
      if (lookupInfo.priceRange) setPrice(lookupInfo.priceRange);
    }

    if (field === 'all') setLookupInfo(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    notification(NotificationType.Success);

    onSave({
      name: name.trim(),
      type,
      brand: brand.trim() || undefined,
      rating: isWishlist ? 0 : rating,
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      price: price.trim() || undefined,
      imageUrl,
      isWishlist,
    });

    resetForm();
    onOpenChange(false);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <div className="flex gap-2 items-center">
          <DrinkImageUploader
            imageUrl={imageUrl}
            onImageChange={setImageUrl}
            isUploading={isUploading}
            onUploadingChange={setIsUploading}
            isCameraActiveRef={isCameraActiveRef}
          />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lagavulin 16"
            required
            className="bg-secondary/50 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleLookup(!!imageUrl)}
            disabled={isLookingUp || (!name.trim() && !imageUrl)}
            title={imageUrl ? 'Identify drink from photo' : 'Look up drink info'}
          >
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : imageUrl ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as DrinkType)}>
          <SelectTrigger className="bg-secondary/50">
            <SelectValue>
              <span className="flex items-center gap-2">
                <span>{isBuiltInDrinkType(type) ? drinkTypeIcons[type] : (customTypes.find(c => c.name === type)?.icon || '🍹')}</span>
                <span>{isBuiltInDrinkType(type) ? drinkTypeLabels[type] : type}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {builtInDrinkTypes.map((t) => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  <span>{drinkTypeIcons[t]}</span>
                  <span>{drinkTypeLabels[t]}</span>
                </span>
              </SelectItem>
            ))}
            {customTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.name}>
                <span className="flex items-center gap-2">
                  <span>{ct.icon}</span>
                  <span>{ct.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between py-2 px-1">
        <div className="space-y-0.5">
          <Label htmlFor="wishlist-toggle" className="text-sm font-medium cursor-pointer">
            Want to try
          </Label>
          <p className="text-xs text-muted-foreground">Save for later without rating</p>
        </div>
        <Switch id="wishlist-toggle" checked={isWishlist} onCheckedChange={setIsWishlist} />
      </div>

      {!isWishlist && (
        <div className="space-y-2">
          <Label>Rating</Label>
          <div className="pt-1">
            <StarRating rating={rating} onChange={setRating} size="lg" />
          </div>
        </div>
      )}

      {lookupInfo && (
        <LookupResultsPanel lookupInfo={lookupInfo} onApply={applyLookupInfo} />
      )}

      <DrinkDetailsForm
        brand={brand}
        onBrandChange={setBrand}
        notes={notes}
        onNotesChange={setNotes}
        location={location}
        onLocationChange={setLocation}
        price={price}
        onPriceChange={setPrice}
        detailsOpen={detailsOpen}
        onDetailsOpenChange={setDetailsOpen}
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="glow" className="flex-1">
          {editDrink ? 'Save Changes' : 'Add Drink'}
        </Button>
      </div>
    </form>
  );

  const title = editDrink ? 'Edit Drink' : 'Add New Drink';

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">{formContent}</div>
      </DialogContent>
    </Dialog>
  );
}
