import { formatDistanceToNow } from 'date-fns';
import { Wine, Star, Heart, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ActivityFeedItem } from '@/types/social';
import { StarRating } from '@/components/StarRating';
import { DrinkTypeBadge } from '@/components/DrinkTypeBadge';
import { useNavigate } from 'react-router-dom';
import { useDrinks } from '@/hooks/useDrinks';
import { useHaptics } from '@/hooks/useHaptics';
import { ImpactStyle } from '@capacitor/haptics';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Drink, DrinkType } from '@/types/drink';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  onDrinkClick?: (drink: Drink) => void;
}

export function ActivityCard({ activity, onDrinkClick }: ActivityCardProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { addDrink } = useDrinks();
  const { impact } = useHaptics();
  const [isSaving, setIsSaving] = useState(false);

  const { user, metadata, activityType, createdAt, drinkId } = activity;

  const getActivityIcon = () => {
    switch (activityType) {
      case 'drink_added':
        return <Wine className="h-4 w-4 text-primary" />;
      case 'drink_rated':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'wishlist_added':
        return <Heart className="h-4 w-4 text-pink-500" />;
      default:
        return <Wine className="h-4 w-4" />;
    }
  };

  const getActivityText = () => {
    switch (activityType) {
      case 'drink_added':
        return 'logged';
      case 'drink_rated':
        return metadata.old_rating ? 'updated rating for' : 'rated';
      case 'wishlist_added':
        return 'added to wishlist';
      default:
        return 'interacted with';
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSaveToWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!metadata.name || !metadata.type || !authUser) return;
    
    setIsSaving(true);
    impact(ImpactStyle.Light);

    try {
      await addDrink({
        name: metadata.name,
        type: metadata.type,
        brand: undefined,
        rating: 0,
        notes: undefined,
        location: undefined,
        price: undefined,
        imageUrl: metadata.image_url || undefined,
        isWishlist: true,
      });
      toast.success(`Added "${metadata.name}" to your wishlist`);
    } catch (error) {
      toast.error('Failed to save to wishlist');
    }

    setIsSaving(false);
  };

  const handleProfileClick = () => {
    if (user?.username) {
      navigate(`/u/${user.username}`);
    }
  };

  const handleDrinkClick = () => {
    if (onDrinkClick && metadata.name && metadata.type && drinkId) {
      // Create a drink object from the activity metadata
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
        isWishlist: activityType === 'wishlist_added',
      };
      onDrinkClick(drink);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <Avatar 
            className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary transition-all"
            onClick={handleProfileClick}
          >
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user?.displayName || user?.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="font-semibold text-foreground cursor-pointer hover:underline"
                onClick={handleProfileClick}
              >
                {user?.displayName || user?.username || 'Unknown'}
              </span>
              <span className="text-muted-foreground text-sm">
                {getActivityText()}
              </span>
              {getActivityIcon()}
            </div>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </p>

            {/* Drink Info - Clickable */}
            {metadata.name && (
              <div 
                className="mt-3 flex gap-3 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                onClick={handleDrinkClick}
              >
                {/* Drink Image */}
                {metadata.image_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={metadata.image_url} 
                      alt={metadata.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {metadata.name}
                  </h4>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {metadata.type && (
                      <DrinkTypeBadge type={metadata.type} size="sm" />
                    )}
                  </div>

                  {/* Rating */}
                  {metadata.rating && activityType !== 'wishlist_added' && (
                    <div className="mt-1">
                      <StarRating rating={metadata.rating} size="sm" readonly />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToWishlist}
                disabled={isSaving}
                className="text-xs"
              >
                <Bookmark className="h-3 w-3 mr-1" />
                Save to Wishlist
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
