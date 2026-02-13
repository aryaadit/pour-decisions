import { Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityCard } from '@/components/ActivityCard';
import { ActivityFeedItem } from '@/types/social';
import { Drink } from '@/types/drink';
import { DrinkOwner } from '@/components/DrinkDetailModal';

interface ActivityTabProps {
  canViewActivity: boolean;
  activityVisibility?: string;
  activities: ActivityFeedItem[];
  activitiesLoading: boolean;
  onDrinkClick: (drink: Drink, owner: DrinkOwner) => void;
}

export function ActivityTab({
  canViewActivity,
  activityVisibility,
  activities,
  activitiesLoading,
  onDrinkClick,
}: ActivityTabProps) {
  if (!canViewActivity) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Activity is private</h3>
        <p className="text-muted-foreground text-sm">
          {activityVisibility === 'followers'
            ? 'Follow this user to see their activity'
            : 'This user keeps their activity private'}
        </p>
      </div>
    );
  }

  if (activitiesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onDrinkClick={onDrinkClick}
        />
      ))}
    </div>
  );
}
