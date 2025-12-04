import { useState, useEffect, useRef, useCallback } from 'react';
import { Drink, DrinkType, drinkTypeLabels, drinkTypeIcons } from '@/types/drink';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptics } from '@/hooks/useHaptics';
import { Camera, X, Loader2, ImagePlus, Search, Sparkles, ChevronDown } from 'lucide-react';
import { takePhoto, pickFromGallery, dataUrlToBlob } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (drink: Omit<Drink, 'id' | 'dateAdded'>) => void;
  editDrink?: Drink | null;
  defaultType?: DrinkType;
}

const drinkTypes: DrinkType[] = ['whiskey', 'beer', 'wine', 'cocktail', 'other'];

export function AddDrinkDialog({ open, onOpenChange, onSave, editDrink, defaultType = 'whiskey' }: AddDrinkDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { impact, notification, ImpactStyle, NotificationType } = useHaptics();
  const [name, setName] = useState('');
  const [type, setType] = useState<DrinkType>('whiskey');
  const [brand, setBrand] = useState('');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{
    tastingNotes?: string | null;
    brandInfo?: string | null;
    priceRange?: string | null;
    suggestions?: string | null;
  } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    // Only initialize form when dialog transitions from closed to open
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
        // Expand details if any optional field has data
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
    setLookupInfo(null);
    setDetailsOpen(false);
  }, [defaultType]);

  const handleLookup = async () => {
    if (!name.trim()) {
      toast.error('Enter a drink name first');
      return;
    }

    impact(ImpactStyle.Light);
    setIsLookingUp(true);
    setLookupInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-drink', {
        body: { drinkName: name.trim(), drinkType: type, brand: brand.trim() || undefined }
      });

      if (error) {
        console.error('Lookup error:', error);
        toast.error('Failed to look up drink info');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success && data?.data) {
        notification(NotificationType.Success);
        setLookupInfo(data.data);
        toast.success('Found drink information!');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Failed to look up drink info');
    } finally {
      setIsLookingUp(false);
    }
  };

  const applyLookupInfo = (field: 'notes' | 'price' | 'all') => {
    impact(ImpactStyle.Light);
    if (!lookupInfo) return;
    
    if (field === 'notes' || field === 'all') {
      const combinedNotes = [
        lookupInfo.tastingNotes,
        lookupInfo.brandInfo,
        lookupInfo.suggestions
      ].filter(Boolean).join('\n\n');
      if (combinedNotes) setNotes(combinedNotes);
    }
    
    if (field === 'price' || field === 'all') {
      if (lookupInfo.priceRange) setPrice(lookupInfo.priceRange);
    }
    
    if (field === 'all') {
      setLookupInfo(null);
      toast.success('Applied drink info');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File | Blob) => {
    if (!user) return;
    
    setIsUploading(true);
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('drink-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('drink-images')
      .getPublicUrl(filePath);

    setImageUrl(publicUrl);
    setIsUploading(false);
  };

  const handleTakePhoto = async () => {
    impact(ImpactStyle.Light);
    const photo = await takePhoto();
    if (photo) {
      const blob = dataUrlToBlob(photo.dataUrl);
      await uploadFile(blob);
    }
  };

  const handlePickFromGallery = async () => {
    impact(ImpactStyle.Light);
    const photo = await pickFromGallery();
    if (photo) {
      const blob = dataUrlToBlob(photo.dataUrl);
      await uploadFile(blob);
    }
  };

  const removeImage = () => {
    setImageUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isNative = Capacitor.isNativePlatform();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Haptic feedback for successful form submission
    notification(NotificationType.Success);

    onSave({
      name: name.trim(),
      type,
      brand: brand.trim() || undefined,
      rating,
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      price: price.trim() || undefined,
      imageUrl,
    });

    resetForm();
    onOpenChange(false);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Essential Fields */}
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <div className="flex gap-2 items-center">
          {/* Photo Button */}
          {imageUrl ? (
            <div className="relative flex-shrink-0">
              <img
                src={imageUrl}
                alt="Drink preview"
                className="w-10 h-10 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : isNative ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isUploading}
                  className="w-10 h-10 flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover z-[60]">
                <DropdownMenuItem onClick={handleTakePhoto}>
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePickFromGallery}>
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Choose from Gallery
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-10 h-10 flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
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
            onClick={handleLookup}
            disabled={isLookingUp || !name.trim()}
            title="Look up drink info"
          >
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
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
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {drinkTypes.map((t) => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  <span>{drinkTypeIcons[t]}</span>
                  <span>{drinkTypeLabels[t]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="pt-1">
          <StarRating rating={rating} onChange={setRating} size="lg" />
        </div>
      </div>

      {/* Lookup Results */}
      {lookupInfo && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              Found Info
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyLookupInfo('all')}
              className="text-xs h-7"
            >
              Apply All
            </Button>
          </div>
          {lookupInfo.tastingNotes && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              <strong>Taste:</strong> {lookupInfo.tastingNotes}
            </p>
          )}
          {lookupInfo.priceRange && (
            <p className="text-xs text-muted-foreground">
              <strong>Price:</strong> {lookupInfo.priceRange}
            </p>
          )}
        </div>
      )}

      {/* Collapsible More Details */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            <span>{detailsOpen ? 'Less details' : 'More details'}</span>
            {!detailsOpen && (brand || notes || location || price) && (
              <span className="text-xs text-primary">(has data)</span>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand / Producer</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g., Lagavulin, The Alchemist"
              className="bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Tasting Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you like about it? Flavor profile, aromas..."
              rows={2}
              className="bg-secondary/50 resize-none"
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Where did you have it?</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bar, restaurant, city..."
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="$15/glass, $45/bottle..."
                className="bg-secondary/50"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" variant="glow" className="flex-1">
          {editDrink ? 'Save Changes' : 'Add Drink'}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="font-display text-xl">
              {editDrink ? 'Edit Drink' : 'Add New Drink'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editDrink ? 'Edit Drink' : 'Add New Drink'}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
