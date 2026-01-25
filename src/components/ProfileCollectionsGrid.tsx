import { FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionCard } from '@/components/CollectionCard';
import { Collection } from '@/types/drink';

interface ProfileCollectionsGridProps {
  collections: Collection[];
  isLoading: boolean;
}

export function ProfileCollectionsGrid({ collections, isLoading }: ProfileCollectionsGridProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No public collections</h3>
        <p className="text-muted-foreground text-sm">
          This user hasn't shared any curated drink groups yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onClick={() => navigate(`/c/${collection.shareId}`)}
        />
      ))}
    </div>
  );
}
