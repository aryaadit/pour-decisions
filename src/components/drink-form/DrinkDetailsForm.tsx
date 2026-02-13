import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface DrinkDetailsFormProps {
  brand: string;
  onBrandChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
}

export function DrinkDetailsForm({
  brand,
  onBrandChange,
  notes,
  onNotesChange,
  location,
  onLocationChange,
  price,
  onPriceChange,
  detailsOpen,
  onDetailsOpenChange,
}: DrinkDetailsFormProps) {
  return (
    <Collapsible open={detailsOpen} onOpenChange={onDetailsOpenChange}>
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
            onChange={(e) => onBrandChange(e.target.value)}
            placeholder="e.g., Lagavulin, The Alchemist"
            className="bg-secondary/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Tasting Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
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
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Bar, restaurant, city..."
              className="bg-secondary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="$15/glass, $45/bottle..."
              className="bg-secondary/50"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
