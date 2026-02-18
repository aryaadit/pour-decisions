import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useIsMobile } from '@/hooks/useMobile';
import { CollectionCard } from '@/components/CollectionCard';
import { PullToRefresh } from '@/components/PullToRefresh';
import { CreateCollectionDialog } from '@/components/CreateCollectionDialog';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, FolderPlus, Loader2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const Collections = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { collections, isLoading, createCollection, refetch } = useCollections();
  const isMobile = useIsMobile();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [collections]);

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
      <PageHeader
        title="Collections"
        subtitle="Organize your drinks"
        icon={<FolderOpen className="h-5 w-5" />}
        showBack={true}
        rightContent={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        }
        helperText="Curated groups to organize drinks from your library"
      />

      {/* Main Content */}
      <PullToRefresh onRefresh={refetch}>
      <main className="container mx-auto px-4 py-6">
        {isLoading || authLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-card/50 border border-border/50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="h-1 -mt-4 -mx-4 mb-3 rounded-t-xl shimmer" />
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded shimmer" />
                    <div className="h-3 w-full rounded shimmer" />
                    <div className="h-3 w-16 rounded shimmer" />
                  </div>
                </div>
              </div>
            ))}
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
            {sortedCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onClick={() => navigate(`/collections/${collection.id}`)}
              />
            ))}
          </div>
        )}
      </main>
      </PullToRefresh>

      {/* Create Collection Dialog */}
      <CreateCollectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateCollection}
      />

      {/* Spacer for bottom nav */}
      {isMobile && <div className="h-20" />}
    </div>
  );
};

export default Collections;
