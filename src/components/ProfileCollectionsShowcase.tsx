import { FolderOpen, Star, Wine, ChevronRight } from 'lucide-react';
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
}

export function ProfileCollectionsShowcase({ collections, isLoading, userId }: ProfileCollectionsShowcaseProps) {
  const navigate = useNavigate();
  const [collectionsWithPreviews, setCollectionsWithPreviews] = useState<CollectionWithPreview[]>([]);
  const [previewsLoading, setPreviewsLoading] = useState(false);

  // Fetch preview drinks for each collection
  useEffect(() => {
    const fetchPreviews = async () => {
      if (collections.length === 0) return;
      
      setPreviewsLoading(true);
      
      const enrichedCollections = await Promise.all(
        collections.map(async (collection) => {
          // Get top 3 drinks from this collection with their details
          const { data: collectionDrinks } = await supabase
            .from('collection_drinks')
            .select('drink_id')
            .eq('collection_id', collection.id)
            .order('added_at', { ascending: false })
            .limit(3);

          if (!collectionDrinks || collectionDrinks.length === 0) {
            return { ...collection, previewDrinks: [], avgRating: undefined };
          }

          const drinkIds = collectionDrinks.map(cd => cd.drink_id);
          
          const { data: drinks } = await supabase
            .from('drinks_public')
            .select('id, name, image_url, rating')
            .in('id', drinkIds);

          const previewDrinks = (drinks || []).map(d => ({
            id: d.id || '',
            name: d.name || '',
            imageUrl: d.image_url || undefined,
            rating: d.rating || undefined,
          }));

          // Calculate average rating
          const ratedDrinks = previewDrinks.filter(d => d.rating && d.rating > 0);
          const avgRating = ratedDrinks.length > 0
            ? ratedDrinks.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDrinks.length
            : undefined;

          return { ...collection, previewDrinks, avgRating };
        })
      );

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
    <div className="space-y-4">
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
                        <img
                          src={drink.imageUrl}
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
    </div>
  );
}
