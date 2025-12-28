import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';

const EMOJI_OPTIONS = [
  '🥃', '🍺', '🍷', '🍸', '🍹', '🍾', '🥂', '🍶', '🫗', '🧉',
  '🍻', '🥤', '🧊', '🍵', '🫖', '🍯', '🧃', '🌵', '🍋', '🫧',
];

const COLOR_OPTIONS = [
  { name: 'Amber', value: '#D97706' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Lime', value: '#65A30D' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Stone', value: '#78716C' },
  { name: 'Slate', value: '#475569' },
];

interface AddCustomDrinkTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, icon: string, color: string) => Promise<{ error?: string } | null>;
}

export function AddCustomDrinkTypeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddCustomDrinkTypeDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍹');
  const [color, setColor] = useState('#8B5CF6');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    setError(null);

    const result = await onAdd(name.trim(), icon, color);

    setIsAdding(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setName('');
    setIcon('🍹');
    setColor('#8B5CF6');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Custom Drink Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name input - full width at top */}
          <div className="space-y-2">
            <Label htmlFor="typeName">Name</Label>
            <Input
              id="typeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tequila, Gin, Sake"
              autoFocus
            />
          </div>

          {/* Icon and Color pickers side by side */}
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Icon</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-2xl"
                  >
                    {icon}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={icon === emoji ? 'default' : 'ghost'}
                        className="w-10 h-10 text-xl p-0"
                        onClick={() => setIcon(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Color</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 p-2"
                  >
                    <div 
                      className="w-full h-full rounded" 
                      style={{ backgroundColor: color }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="grid grid-cols-4 gap-1">
                    {COLOR_OPTIONS.map((c) => (
                      <Button
                        key={c.value}
                        type="button"
                        variant="ghost"
                        className="w-12 h-12 p-1"
                        onClick={() => setColor(c.value)}
                        title={c.name}
                      >
                        <div 
                          className="w-full h-full rounded-md border-2"
                          style={{ 
                            backgroundColor: c.value,
                            borderColor: color === c.value ? 'white' : 'transparent',
                            boxShadow: color === c.value ? '0 0 0 2px hsl(var(--primary))' : 'none'
                          }}
                        />
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center justify-center gap-2 py-3">
            <span
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border"
              style={{ 
                backgroundColor: `${color}20`,
                color: color,
                borderColor: `${color}40`
              }}
            >
              <span>{icon}</span>
              <span>{name || 'Drink Type'}</span>
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isAdding}>
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Type
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
