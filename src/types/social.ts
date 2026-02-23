export type ActivityVisibility = 'private' | 'followers' | 'public';
export type FollowStatus = 'pending' | 'accepted';
export type ActivityType = 'drink_added' | 'drink_rated';
export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected';
export type FollowRelationship = 'none' | 'following' | 'requested';
export type NotificationType = 'new_follower' | 'follow_request' | 'follow_accepted' | 'drink_logged';

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: FollowStatus;
  createdAt: Date;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  activityType: ActivityType;
  drinkId: string | null;
  metadata: {
    name?: string;
    type?: string;
    rating?: number;
    old_rating?: number;
    image_url?: string;
    notes?: string;
    location?: string;
  };
  createdAt: Date;
  // Joined data
  user?: PublicProfile;
}

export interface PublicProfile {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isPublic: boolean;
  activityVisibility: ActivityVisibility;
  createdAt: Date;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: FollowRequestStatus;
  createdAt: Date;
  respondedAt: Date | null;
  requester?: PublicProfile;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  referenceId: string | null;
  metadata: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
  actor?: PublicProfile;
}

export interface SuggestedUser extends PublicProfile {
  recentDrinkCount: number;
}

export const activityVisibilityLabels: Record<ActivityVisibility, string> = {
  private: 'Only me',
  followers: 'My followers',
  public: 'Everyone',
};

export const activityVisibilityDescriptions: Record<ActivityVisibility, string> = {
  private: 'Your drink activity is hidden from others',
  followers: 'Only people who follow you can see your activity',
  public: 'Anyone can see your drink activity',
};
