import { Wine, Star, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileStats } from '@/hooks/useProfileStats';
import { format } from 'date-fns';

interface ProfileStatsCardProps {
  stats: ProfileStats | null;
  isLoading: boolean;
}

export function ProfileStatsCard({ stats, isLoading }: ProfileStatsCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: 'Drinks Logged',
      value: stats.totalDrinks.toString(),
      icon: <Wine className="h-4 w-4 text-primary" />,
    },
    stats.favoriteType && {
      label: 'Favorite Type',
      value: stats.favoriteType.icon,
      subtext: stats.favoriteType.type.charAt(0).toUpperCase() + stats.favoriteType.type.slice(1),
      icon: null,
    },
    stats.averageRating && {
      label: 'Avg Rating',
      value: stats.averageRating.toFixed(1),
      icon: <Star className="h-4 w-4 text-amber-500 fill-amber-500" />,
    },
    stats.topRatedDrink && {
      label: 'Top Rated',
      value: `${stats.topRatedDrink.rating}★`,
      subtext: stats.topRatedDrink.name,
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
    },
    stats.memberSince && {
      label: 'Member Since',
      value: format(stats.memberSince, 'MMM yyyy'),
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
    },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Stats
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statItems.map((item, index) => (
          <Card 
            key={index} 
            className="bg-card/50 border-border/50 hover:bg-card/80 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                {item!.icon}
                <span>{item!.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">
                  {item!.value}
                </span>
              </div>
              {item!.subtext && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item!.subtext}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
