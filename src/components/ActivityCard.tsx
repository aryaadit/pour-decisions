import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Wine, Star, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActivityFeedItem } from '@/types/social';
import { DrinkTypeBadge } from '@/components/DrinkTypeBadge';
import { StorageImage } from '@/components/StorageImage';
import { useNavigate } from 'react-router-dom';
import { Drink, DrinkType, isBuiltInDrinkType, drinkTypeIcons } from '@/types/drink';
import { DrinkOwner } from './DrinkDetailModal';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { getInitials } from '@/lib/utils';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  onDrinkClick?: (drink: Drink, owner: DrinkOwner) => void;
}

export const ActivityCard = memo(function ActivityCard({ activity, onDrinkClick }: ActivityCardProps) {
  const navigate = useNavigate();

  const { user, metadata, activityType, createdAt, drinkId } = activity;

  const getActivityIcon = () => {
    switch (activityType) {
      case 'drink_added':
        return <Wine className="h-3 w-3 text-primary" />;
      case 'drink_rated':
        return <Star className="h-3 w-3 text-yellow-500" />;
      default:
        return <Wine className="h-3 w-3" />;
    }
  };

  const getActivityText = () => {
    switch (activityType) {
      case 'drink_added':
        return 'logged';
      case 'drink_rated':
        return metadata.old_rating ? 'updated' : 'rated';
      default:
        return 'interacted with';
    }
  };

  const getDrinkTypeIcon = (type: string) => {
    return isBuiltInDrinkType(type) ? drinkTypeIcons[type] : '🍹';
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.username) {
      navigate(`/u/${user.username}`);
    }
  };

  const handleCardClick = () => {
    if (onDrinkClick && metadata.name && metadata.type && drinkId && user) {
      const drink: Drink = {
        id: drinkId,
        name: metadata.name,
        type: metadata.type as DrinkType,
        brand: undefined,
        rating: metadata.rating || 0,
        notes: undefined,
        location: undefined,
        price: undefined,
        dateAdded: createdAt,
        imageUrl: metadata.image_url || undefined,
      };
      const owner: DrinkOwner = {
        username: user.username,
        displayName: user.displayName,
      };
      onDrinkClick(drink, owner);
    }
  };

  const notesPreview = metadata.notes
    ? metadata.notes.length > 120
      ? metadata.notes.substring(0, 120).trim() + '...'
      : metadata.notes
    : null;

  const { signedUrl: avatarUrl } = useSignedUrl(user?.avatarUrl);

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.99]"
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex gap-2.5">
          {/* User Avatar */}
          <Avatar
            className="h-8 w-8 shrink-0 cursor-pointer hover:ring-2 ring-primary transition-all"
            onClick={handleProfileClick}
          >
            {avatarUrl && <img src={avatarUrl} alt="" className="h-full w-full object-cover" />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(user?.displayName || user?.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 text-sm">
              <span
                className="font-medium text-foreground truncate cursor-pointer hover:underline"
                onClick={handleProfileClick}
              >
                {user?.displayName || user?.username || 'Unknown'}
              </span>
              <span className="text-muted-foreground text-xs shrink-0">
                {getActivityText()}
              </span>
              {getActivityIcon()}
              <span className="text-muted-foreground text-xs shrink-0">
                · {formatDistanceToNow(createdAt, { addSuffix: false })}
              </span>
            </div>

            {/* Drink Info */}
            {metadata.name && (
              <div className="mt-1.5 flex gap-3">
                {/* Drink Image - Larger */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {metadata.image_url ? (
                    <StorageImage
                      storagePath={metadata.image_url}
                      alt={metadata.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">
                      {metadata.type ? getDrinkTypeIcon(metadata.type) : '🍹'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  {/* Drink name + rating on one line */}
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {metadata.name}
                    </h4>
                    {metadata.rating && (
                      <span className="text-xs font-medium text-amber-500 shrink-0">
                        {metadata.rating}★
                      </span>
                    )}
                  </div>

                  {/* Type + location on second line */}
                  <div className="flex items-center gap-2 text-xs">
                    {metadata.type && (
                      <DrinkTypeBadge type={metadata.type} size="sm" />
                    )}
                    {metadata.location && (
                      <span className="flex items-center gap-1 text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{metadata.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Notes as truncated quote */}
                  {notesPreview && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed border-l-2 border-muted-foreground/20 pl-2 italic">
                      {notesPreview}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
