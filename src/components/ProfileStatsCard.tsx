import { Wine, Star, Layers, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileStats } from '@/hooks/useProfileStats';
import { format } from 'date-fns';

interface ProfileStatsCardProps {
  stats: ProfileStats | null;
  isLoading: boolean;
  categoriesCount?: number;
}

export function ProfileStatsCard({ stats, isLoading, categoriesCount = 0 }: ProfileStatsCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-10 w-24 mx-auto" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-5 space-y-4">
        {/* Hero stat */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Wine className="h-5 w-5 text-primary" />
            <span className="text-3xl font-bold text-foreground">{stats.totalDrinks}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">drinks logged</p>
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
          {/* Avg Rating */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="text-lg font-semibold text-foreground">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '—'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </div>

          {/* Favorite Type */}
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {stats.favoriteType ? stats.favoriteType.icon : '—'}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stats.favoriteType
                ? `Favorite`
                : 'No fave'}
            </p>
          </div>

          {/* Categories */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-lg font-semibold text-foreground">
                {categoriesCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Categories</p>
          </div>
        </div>

        {/* Member since */}
        {stats.memberSince && (
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/50">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Member since {format(stats.memberSince, 'MMMM yyyy')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
