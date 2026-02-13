import { Drink, DrinkType, Collection } from '@/types/drink';
import { PublicProfile, ActivityFeedItem, ActivityVisibility } from '@/types/social';
import { Profile, SortOrder, ThemePreference, OnboardingStep } from '@/types/profile';

export function mapDrinkRow(d: any): Drink {
  return {
    id: d.id,
    name: d.name,
    type: d.type as DrinkType,
    brand: d.brand || undefined,
    rating: d.rating || 0,
    notes: d.notes || undefined,
    location: d.location || undefined,
    price: d.price || undefined,
    dateAdded: new Date(d.date_added),
    imageUrl: d.image_url || undefined,
    isWishlist: d.is_wishlist || false,
  };
}

export function mapPublicDrinkRow(d: any): Drink {
  return {
    id: d.id,
    name: d.name,
    type: d.type as DrinkType,
    brand: d.brand || undefined,
    rating: d.rating || 0,
    notes: undefined,
    location: undefined,
    price: undefined,
    dateAdded: new Date(d.date_added),
    imageUrl: d.image_url || undefined,
    isWishlist: d.is_wishlist || false,
  };
}

export function mapCollectionRow(c: any): Collection {
  return {
    id: c.id,
    name: c.name,
    description: c.description || undefined,
    icon: c.icon || '📚',
    coverColor: c.cover_color || '#8B5CF6',
    shareId: c.share_id || '',
    isPublic: c.is_public || false,
    isSystem: c.is_system || false,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
    drinkCount: c.collection_drinks?.[0]?.count || 0,
  };
}

export function mapPublicProfileRow(p: any): PublicProfile {
  return {
    userId: p.user_id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    bio: p.bio,
    isPublic: p.is_public || false,
    activityVisibility: (p.activity_visibility as ActivityVisibility) || 'private',
    createdAt: new Date(p.created_at || Date.now()),
  };
}

export function mapProfileRow(data: any): Profile {
  return {
    id: data.id,
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    defaultDrinkType: data.default_drink_type as DrinkType | null,
    defaultSortOrder: (data.default_sort_order as SortOrder) || 'date_desc',
    themePreference: (data.theme_preference as ThemePreference) || 'system',
    username: data.username,
    bio: data.bio,
    isPublic: data.is_public || false,
    activityVisibility: (data.activity_visibility as ActivityVisibility) || 'private',
    hasSeenWelcome: data.has_seen_welcome || false,
    onboardingStep: (data.onboarding_step as OnboardingStep) || 'welcome',
    dismissedOnboardingSteps: (data.dismissed_onboarding_steps as OnboardingStep[]) || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export function mapActivityFeedItem(item: any, user?: PublicProfile): ActivityFeedItem {
  return {
    id: item.id,
    userId: item.user_id,
    activityType: item.activity_type as 'drink_added' | 'drink_rated' | 'wishlist_added',
    drinkId: item.drink_id,
    metadata: item.metadata as ActivityFeedItem['metadata'],
    createdAt: new Date(item.created_at),
    user,
  };
}
