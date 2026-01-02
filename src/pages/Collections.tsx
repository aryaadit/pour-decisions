import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useIsMobile } from '@/hooks/use-mobile';
import { CollectionCard } from '@/components/CollectionCard';
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, FolderPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Collections = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { collections, isLoading, createCollection } = useCollections();
  const isMobile = useIsMobile();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleCreateCollection = async (
    name: string,
    description?: string,
    icon?: string,
    coverColor?: string
  ) => {
    const collection = await createCollection(name, description, icon, coverColor);
    if (collection) {
      toast.success(`Created "${name}"`);
      return collection;
    } else {
      toast.error('Failed to create collection');
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-foreground">
                Collections
              </h1>
              <p className="text-xs text-muted-foreground">
                Organize your drinks
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {isLoading || authLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="font-display text-lg font-semibold">No collections yet</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Create collections to organize your drinks into groups like "Summer Favorites" or "Gift Ideas"
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} variant="glow">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Collection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {collections.map((collection, index) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onClick={() => navigate(`/collections/${collection.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateCollection}
      />

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNavigation />}
      {isMobile && <div className="h-20" />}
    </div>
  );
};

export default Collections;
