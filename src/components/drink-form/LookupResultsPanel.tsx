import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { toast } from 'sonner';

export interface LookupInfo {
  tastingNotes?: string | null;
  brandInfo?: string | null;
  priceRange?: string | null;
  suggestions?: string | null;
  drinkName?: string;
  drinkBrand?: string;
  drinkType?: string;
}

interface LookupResultsPanelProps {
  lookupInfo: LookupInfo;
  onApply: (field: 'notes' | 'price' | 'all') => void;
}

export function LookupResultsPanel({ lookupInfo, onApply }: LookupResultsPanelProps) {
  const { impact, ImpactStyle } = useHaptics();

  const handleApply = (field: 'notes' | 'price' | 'all') => {
    impact(ImpactStyle.Light);
    onApply(field);
    if (field === 'all') {
      toast.success('Applied drink info');
    }
  };

  return (
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
          onClick={() => handleApply('all')}
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
  );
}
