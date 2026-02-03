import { formatDistanceToNow } from 'date-fns';
import { Wine, Star, Heart, Bookmark, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ActivityFeedItem } from '@/types/social';
import { StarRating } from '@/components/StarRating';
import { DrinkTypeBadge } from '@/components/DrinkTypeBadge';
import { StorageImage } from '@/components/StorageImage';
import { useNavigate } from 'react-router-dom';
import { useDrinks } from '@/hooks/useDrinks';
import { useHaptics } from '@/hooks/useHaptics';
import { ImpactStyle } from '@capacitor/haptics';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Drink, DrinkType } from '@/types/drink';
import { DrinkOwner } from './DrinkDetailModal';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  onDrinkClick?: (drink: Drink, owner: DrinkOwner) => void;
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
        return <Wine className="h-3 w-3 text-primary" />;
      case 'drink_rated':
        return <Star className="h-3 w-3 text-yellow-500" />;
      case 'wishlist_added':
        return <Heart className="h-3 w-3 text-pink-500" />;
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
      case 'wishlist_added':
        return 'wants to try';
      default:
        return 'interacted with';
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Truncate notes for preview
  const getNotesPreview = (notes: string | undefined, maxLength = 100) => {
    if (!notes) return null;
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength).trim() + '...';
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
        isWishlist: activityType === 'wishlist_added',
      };
      const owner: DrinkOwner = {
        username: user.username,
        displayName: user.displayName,
      };
      onDrinkClick(drink, owner);
    }
  };

  const notesPreview = getNotesPreview(metadata.notes);
  const { signedUrl: avatarUrl } = useSignedUrl(user?.avatarUrl);

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors active:scale-[0.99]"
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex gap-2.5">
          {/* User Avatar - Smaller */}
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
            {/* Compact Header */}
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

            {/* Drink Info - Compact */}
            {metadata.name && (
              <div className="mt-1.5 flex gap-2.5">
                {/* Drink Image - Smaller */}
                {metadata.image_url && (
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                    <StorageImage 
                      storagePath={metadata.image_url} 
                      alt={metadata.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  {/* Drink name and type inline */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {metadata.name}
                    </h4>
                    {metadata.type && (
                      <DrinkTypeBadge type={metadata.type} size="sm" />
                    )}
                  </div>

                  {/* Rating and location inline */}
                  <div className="flex items-center gap-3 text-xs">
                    {metadata.rating && activityType !== 'wishlist_added' && (
                      <StarRating rating={metadata.rating} size="sm" readonly />
                    )}
                    {metadata.location && (
                      <span className="flex items-center gap-1 text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{metadata.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Notes Preview */}
                  {notesPreview && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      "{notesPreview}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Compact Action */}
            <div className="mt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveToWishlist}
                disabled={isSaving}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <Bookmark className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
