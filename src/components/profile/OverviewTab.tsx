import { Lock, Wine } from 'lucide-react';
import { ProfileStatsCard } from '@/components/ProfileStatsCard';
import { TopDrinksShowcase } from '@/components/TopDrinksShowcase';
import { ProfileStats, TopDrink } from '@/hooks/useProfileStats';

interface OverviewTabProps {
  canViewStats: boolean;
  activityVisibility?: string;
  stats: ProfileStats | null;
  topDrinks: TopDrink[];
  statsLoading: boolean;
  onTopDrinkClick: (drink: TopDrink) => void;
}

export function OverviewTab({
  canViewStats,
  activityVisibility,
  stats,
  topDrinks,
  statsLoading,
  onTopDrinkClick,
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
      <ProfileStatsCard stats={stats} isLoading={statsLoading} />
      <TopDrinksShowcase
        drinks={topDrinks}
        isLoading={statsLoading}
        onDrinkClick={onTopDrinkClick}
      />

      {!statsLoading && stats?.totalDrinks === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Wine className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No drinks logged yet</p>
        </div>
      )}
    </>
  );
}
