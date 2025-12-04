import { useState, useEffect, useRef } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptics } from '@/hooks/useHaptics';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import { takePhoto, pickFromGallery, dataUrlToBlob } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editDrink) {
      setName(editDrink.name);
      setType(editDrink.type);
      setBrand(editDrink.brand || '');
      setRating(editDrink.rating);
      setNotes(editDrink.notes || '');
      setLocation(editDrink.location || '');
      setPrice(editDrink.price || '');
      setImageUrl(editDrink.imageUrl);
    } else {
      resetForm();
    }
  }, [editDrink, open]);

  const resetForm = () => {
    setName('');
    setType(defaultType);
    setBrand('');
    setRating(3);
    setNotes('');
    setLocation('');
    setPrice('');
    setImageUrl(undefined);
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lagavulin 16"
            required
            className="bg-secondary/50"
          />
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
      </div>

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
        <Label>Rating</Label>
        <div className="pt-1">
          <StarRating rating={rating} onChange={setRating} size="lg" />
        </div>
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

      <div className="space-y-2">
        <Label>Photo</Label>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Drink preview"
                className="w-16 h-16 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
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
                  className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span className="text-xs">Add</span>
                    </>
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
              className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-xs">Add</span>
                </>
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
        </div>
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
