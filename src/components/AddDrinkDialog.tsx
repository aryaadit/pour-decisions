import { useState, useEffect } from 'react';
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


interface AddDrinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (drink: Omit<Drink, 'id' | 'dateAdded'>) => void;
  editDrink?: Drink | null;
}

const drinkTypes: DrinkType[] = ['whiskey', 'beer', 'wine', 'cocktail', 'other'];

export function AddDrinkDialog({ open, onOpenChange, onSave, editDrink }: AddDrinkDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DrinkType>('whiskey');
  const [brand, setBrand] = useState('');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (editDrink) {
      setName(editDrink.name);
      setType(editDrink.type);
      setBrand(editDrink.brand || '');
      setRating(editDrink.rating);
      setNotes(editDrink.notes || '');
      setLocation(editDrink.location || '');
      setPrice(editDrink.price || '');
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
