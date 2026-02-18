import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { PageHeader } from '@/components/PageHeader';
import { EmojiInput } from '@/components/ui/EmojiInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Share2, Settings } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  '#8B5CF6', '#EC4899', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1',
];

const CollectionSettings = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { collections, updateCollection, deleteCollection, togglePublic, refetch } = useCollections();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🍸');
  const [coverColor, setCoverColor] = useState('#8B5CF6');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const collection = collections.find((c) => c.id === id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || '');
      setIcon(collection.icon);
      setCoverColor(collection.coverColor);
      setIsPublic(collection.isPublic);
    }
  }, [collection]);

  const handleSave = async () => {
    if (!collection || !name.trim()) return;

    setIsSaving(true);
    const success = await updateCollection(collection.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      coverColor,
      isPublic,
    });
    setIsSaving(false);

    if (success) {
      refetch();
      toast.success('Collection updated');
      navigate(`/collections/${collection.id}`);
    } else {
      toast.error('Failed to update collection');
    }
  };

  const handleDelete = async () => {
    if (!collection) return;

    const success = await deleteCollection(collection.id);
    if (success) {
      toast.success('Collection deleted');
      navigate('/collections');
    } else {
      toast.error('Failed to delete collection');
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);
  };

  const handleCopyShareLink = () => {
    if (!collection) return;
    const shareUrl = `${window.location.origin}/share/${collection.shareId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!');
  };

  if (!collection || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Collection Settings"
        icon={<Settings className="h-5 w-5" />}
        showBack={true}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Icon and Color */}
        <div className="flex items-center gap-3">
          <EmojiInput
            value={icon}
            onChange={setIcon}
            defaultEmoji="🍸"
            backgroundColor={coverColor}
          />

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

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="collection-name">Name *</Label>
          <Input
            id="collection-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name"
            className="bg-secondary/50 h-12 text-base"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="collection-description">Description</Label>
          <Textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            className="bg-secondary/50 resize-none text-base"
            rows={3}
          />
        </div>

        {/* Visibility */}
        <div className="flex items-center justify-between py-3">
          <div className="space-y-0.5">
            <Label htmlFor="collection-public">Public</Label>
            <p className="text-sm text-muted-foreground">
              Anyone with the link can view this collection
            </p>
          </div>
          <Switch
            id="collection-public"
            checked={isPublic}
            onCheckedChange={handleTogglePublic}
          />
        </div>

        {isPublic && (
          <Button variant="outline" onClick={handleCopyShareLink} className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Copy Share Link
          </Button>
        )}

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="w-full h-12"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Changes
        </Button>

        {/* Delete */}
        <Button
          variant="outline"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          Delete Collection
        </Button>
      </main>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{collection.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the collection. The drinks in this collection will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollectionSettings;
