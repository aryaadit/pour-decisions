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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, X, Loader2 } from 'lucide-react';


interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (drink: Omit<Drink, 'id' | 'dateAdded'>) => void;
  editDrink?: Drink | null;
}

const drinkTypes: DrinkType[] = ['whiskey', 'beer', 'wine', 'cocktail', 'other'];

export function AddDrinkDialog({ open, onOpenChange, onSave, editDrink }: AddDrinkDialogProps) {
  const { user } = useAuth();
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
    setType('whiskey');
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

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
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

  const removeImage = () => {
    setImageUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editDrink ? 'Edit Drink' : 'Add New Drink'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
                <SelectContent>
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
              rows={3}
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
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
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

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="flex gap-3 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
