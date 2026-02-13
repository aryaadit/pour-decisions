import { Lock, Wine } from 'lucide-react';
import { ProfileStatsCard } from '@/components/ProfileStatsCard';
import { TasteSignatureCard } from '@/components/TasteSignatureCard';
import { CategoryTopDrinksShowcase } from '@/components/CategoryTopDrinksShowcase';
import { ProfileStats } from '@/hooks/useProfileStats';
import { TasteSignature, CategoryTopDrinks, TopDrinkEntry } from '@/types/taste';
import { Collection } from '@/types/drink';
import { ProfileCollectionsShowcase } from '@/components/ProfileCollectionsShowcase';

interface OverviewTabProps {
  canViewStats: boolean;
  activityVisibility?: string;
  stats: ProfileStats | null;
  tasteSignature: TasteSignature | null;
  categoryTopDrinks: CategoryTopDrinks[];
  statsLoading: boolean;
  onCategoryDrinkClick: (drink: TopDrinkEntry) => void;
  publicCollections?: Collection[];
  collectionsLoading?: boolean;
  profileUserId?: string;
}

export function OverviewTab({
  canViewStats,
  activityVisibility,
  stats,
  tasteSignature,
  categoryTopDrinks,
  statsLoading,
  onCategoryDrinkClick,
  publicCollections,
  collectionsLoading,
  profileUserId,
}: OverviewTabProps) {
  if (!canViewStats) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Stats are private</h3>
        <p className="text-muted-foreground text-sm">
          {activityVisibility === 'followers'
            ? 'Follow this user to see their stats'
            : 'This user keeps their stats private'}
        </p>
      </div>
    );
  }

  return (
    <>
      <ProfileStatsCard
        stats={stats}
        isLoading={statsLoading}
        categoriesCount={tasteSignature?.breakdown.length ?? 0}
      />
      <TasteSignatureCard signature={tasteSignature} isLoading={statsLoading} />
      <CategoryTopDrinksShowcase
        categories={categoryTopDrinks}
        isLoading={statsLoading}
        onDrinkClick={onCategoryDrinkClick}
      />
      {publicCollections && (
        <ProfileCollectionsShowcase
          collections={publicCollections}
          isLoading={collectionsLoading ?? false}
          userId={profileUserId}
        />
      )}

      {!statsLoading && stats?.totalDrinks === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wine className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No drinks logged yet</p>
        </div>
      )}
    </>
  );
}
