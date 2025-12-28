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
  '🍻', '🥤', '🧊', '🍵', '🫖', '🍯', '🧃', '🥛', '☕', '🫧',
];

interface AddCustomDrinkTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, icon: string) => Promise<{ error?: string } | null>;
}

export function AddCustomDrinkTypeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddCustomDrinkTypeDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍹');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsAdding(true);
    setError(null);

    const result = await onAdd(name.trim(), icon);

    setIsAdding(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setName('');
    setIcon('🍹');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Drink Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-14 h-14 text-2xl"
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
            <div className="flex-1 space-y-2">
              <Label htmlFor="typeName">Name</Label>
              <Input
                id="typeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Tequila, Gin, Sake"
                className="h-14"
                autoFocus
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
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
