import { Star, Wine, ChevronRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageImage } from '@/components/StorageImage';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Collection, Drink } from '@/types/drink';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CollectionWithPreview extends Collection {
  previewDrinks: {
    id: string;
    name: string;
    imageUrl?: string;
    rating?: number;
  }[];
  avgRating?: number;
}

interface ProfileCollectionsShowcaseProps {
  collections: Collection[];
  isLoading: boolean;
  userId?: string;
  isOwnProfile?: boolean;
}

export function ProfileCollectionsShowcase({ collections, isLoading, userId, isOwnProfile }: ProfileCollectionsShowcaseProps) {
  const navigate = useNavigate();
  const [collectionsWithPreviews, setCollectionsWithPreviews] = useState<CollectionWithPreview[]>([]);
  const [previewsLoading, setPreviewsLoading] = useState(false);

  // Fetch preview drinks for all collections in 2 batched queries (not 2N)
  useEffect(() => {
    const fetchPreviews = async () => {
      if (collections.length === 0) return;

      setPreviewsLoading(true);

      const allCollectionIds = collections.map(c => c.id);

      // Query 1: Get all collection_drinks for these collections
      const { data: allCollectionDrinks } = await supabase
        .from('collection_drinks')
        .select('collection_id, drink_id, added_at')
        .in('collection_id', allCollectionIds)
        .order('added_at', { ascending: false });

      // Group by collection, take top 3 each
      const drinkIdsByCollection = new Map<string, string[]>();
      const allDrinkIds = new Set<string>();
      for (const cd of (allCollectionDrinks || [])) {
        const existing = drinkIdsByCollection.get(cd.collection_id) || [];
        if (existing.length < 3) {
          existing.push(cd.drink_id);
          drinkIdsByCollection.set(cd.collection_id, existing);
          allDrinkIds.add(cd.drink_id);
        }
      }

      // Query 2: Fetch all needed drinks in one query
      interface DrinkPreviewRow { id: string; name: string; image_url: string | null; rating: number | null }
      let drinksMap = new Map<string, DrinkPreviewRow>();
      if (allDrinkIds.size > 0) {
        const { data: allDrinks } = await supabase
          .from('drinks_public')
          .select('id, name, image_url, rating')
          .in('id', [...allDrinkIds]);
        drinksMap = new Map((allDrinks || []).map(d => [d.id, d]));
      }

      // Build enriched collections
      const enrichedCollections = collections.map(collection => {
        const drinkIds = drinkIdsByCollection.get(collection.id) || [];
        const previewDrinks = drinkIds
          .map(id => drinksMap.get(id))
          .filter(Boolean)
          .map((d) => ({
            id: d.id,
            name: d.name,
            imageUrl: d.image_url || undefined,
            rating: d.rating || undefined,
          }));

        const ratedDrinks = previewDrinks.filter(d => d.rating && d.rating > 0);
        const avgRating = ratedDrinks.length > 0
          ? ratedDrinks.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDrinks.length
          : undefined;

        return { ...collection, previewDrinks, avgRating };
      });

      setCollectionsWithPreviews(enrichedCollections);
      setPreviewsLoading(false);
    };

    fetchPreviews();
  }, [collections]);

  if (isLoading || previewsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Collections
      </h3>
      {collectionsWithPreviews.map((collection) => (
        <button
          key={collection.id}
          onClick={() => navigate(`/c/${collection.shareId}`)}
          className="w-full text-left group"
        >
          <div
            className="relative rounded-xl overflow-hidden p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${collection.coverColor}15, ${collection.coverColor}08)`,
              borderLeft: `3px solid ${collection.coverColor}`,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: `${collection.coverColor}20` }}
              >
                {collection.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {collection.name}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>

                {collection.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {collection.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wine className="h-3 w-3" />
                    {collection.drinkCount} {collection.drinkCount === 1 ? 'drink' : 'drinks'}
                  </span>
                  {collection.avgRating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {collection.avgRating.toFixed(1)} avg
                    </span>
                  )}
                </div>
              </div>

              {/* Preview thumbnails */}
              {collection.previewDrinks.length > 0 && (
                <div className="flex -space-x-2 shrink-0">
                  {collection.previewDrinks.slice(0, 3).map((drink, index) => (
                    <div
                      key={drink.id}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 border-background overflow-hidden bg-muted",
                        "shadow-sm"
                      )}
                      style={{ zIndex: 3 - index }}
                    >
                      {drink.imageUrl ? (
                        <StorageImage
                          storagePath={drink.imageUrl}
                          alt={drink.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Wine className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
      {isOwnProfile && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/collections')}
          className="w-full"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Manage Collections
        </Button>
      )}
    </div>
  );
}
