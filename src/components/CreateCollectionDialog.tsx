import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { Collection } from '@/types/drink';
import { ResponsiveModal } from '@/components/ResponsiveModal';

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string, icon?: string, coverColor?: string) => Promise<Collection | null>;
  editCollection?: Collection | null;
}

const ICONS = ['📚', '🍸', '🍷', '🍺', '🥃', '🍹', '🥤', '☕', '🎉', '⭐', '❤️', '🔥', '🌟', '🏆', '🎯', '💎'];
const COLORS = [
  '#8B5CF6', '#EC4899', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1',
];

export function CreateCollectionDialog({
  open,
  onOpenChange,
  onSave,
  editCollection,
}: CreateCollectionDialogProps) {
  const { notification, NotificationType } = useHaptics();
  const [name, setName] = useState(editCollection?.name || '');
  const [description, setDescription] = useState(editCollection?.description || '');
  const [icon, setIcon] = useState(editCollection?.icon || '📚');
  const [coverColor, setCoverColor] = useState(editCollection?.coverColor || '#8B5CF6');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    const result = await onSave(name.trim(), description.trim() || undefined, icon, coverColor);
    setIsSaving(false);

    if (result) {
      notification(NotificationType.Success);
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('📚');
    setCoverColor('#8B5CF6');
  };

  const content = (
    <div className="space-y-4">
      {/* Icon and Color pickers */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border border-border hover:border-primary/50 transition-colors"
              style={{ backgroundColor: `${coverColor}20` }}
            >
              {icon}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="grid grid-cols-8 gap-1">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-xl hover:bg-muted transition-colors ${icon === i ? 'bg-primary/20' : ''}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-14 h-14 rounded-xl border border-border hover:border-primary/50 transition-colors"
              style={{ backgroundColor: coverColor }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${coverColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="collection-name">Name *</Label>
        <Input
          id="collection-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer Favorites"
          className="bg-secondary/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="collection-description">Description</Label>
        <Textarea
          id="collection-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          className="bg-secondary/50 resize-none"
          rows={2}
        />
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={!name.trim() || isSaving} className="flex-1">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {editCollection ? 'Save Changes' : 'Create'}
      </Button>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={editCollection ? 'Edit Collection' : 'Create Collection'}
      footer={footer}
    >
      {content}
    </ResponsiveModal>
  );
}
