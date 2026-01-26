import { DrinkType } from './drink';
import { ActivityVisibility } from './social';

export type SortOrder = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc' | 'name_asc' | 'name_desc';
export type ThemePreference = 'light' | 'dark' | 'system';
export type OnboardingStep = 'welcome' | 'add_drink' | 'collections' | 'social' | 'completed';

export interface Profile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  defaultDrinkType: DrinkType | null;
  defaultSortOrder: SortOrder;
  themePreference: ThemePreference;
  username: string | null;
  bio: string | null;
  isPublic: boolean;
  activityVisibility: ActivityVisibility;
  hasSeenWelcome: boolean;
  onboardingStep: OnboardingStep;
  dismissedOnboardingSteps: OnboardingStep[];
  createdAt: Date;
  updatedAt: Date;
}

export const sortOrderLabels: Record<SortOrder, string> = {
  date_desc: 'Newest first',
  date_asc: 'Oldest first',
  rating_desc: 'Highest rated',
  rating_asc: 'Lowest rated',
  name_asc: 'Name (A-Z)',
  name_desc: 'Name (Z-A)',
};
