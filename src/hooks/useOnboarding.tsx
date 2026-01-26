import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo } from 'react';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { OnboardingStep } from '@/types/profile';

interface OnboardingState {
  hasSeenWelcome: boolean;
  hasCompletedOnboarding: boolean;
  currentStep: OnboardingStep;
  dismissedSteps: OnboardingStep[];
}

interface OnboardingContextType {
  state: OnboardingState;
  showWelcomeCarousel: boolean;
  isStepVisible: (step: OnboardingStep) => boolean;
  dismissStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;
  completeWelcome: () => void;
  resetOnboarding: () => void;
  showTour: () => void;
  isLoading: boolean;
}

const STORAGE_KEY = 'barkeeply_onboarding';

const defaultState: OnboardingState = {
  hasSeenWelcome: false,
  hasCompletedOnboarding: false,
  currentStep: 'welcome',
  dismissedSteps: [],
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  
  // Local optimistic state for immediate UI updates
  const [localState, setLocalState] = useState<OnboardingState | null>(null);
  const [hasMigratedLocalStorage, setHasMigratedLocalStorage] = useState(false);

  // Derive state from profile or use local state for guests
  const derivedState = useMemo((): OnboardingState => {
    // If we have local optimistic state, use it
    if (localState) return localState;
    
    // If user is logged in and profile is loaded, use profile data
    if (user && profile) {
      return {
        hasSeenWelcome: profile.hasSeenWelcome,
        hasCompletedOnboarding: profile.onboardingStep === 'completed',
        currentStep: profile.onboardingStep,
        dismissedSteps: profile.dismissedOnboardingSteps,
      };
    }
    
    // For guests or while loading, try localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load onboarding state from localStorage:', e);
    }
    
    return defaultState;
  }, [user, profile, localState]);

  // Migrate localStorage to database on login
  useEffect(() => {
    if (!user || !profile || hasMigratedLocalStorage || profileLoading) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const localData = JSON.parse(stored) as OnboardingState;
        
        // Only migrate if user has progressed in localStorage but database has defaults
        if (localData.hasSeenWelcome && !profile.hasSeenWelcome) {
          updateProfile({
            hasSeenWelcome: localData.hasSeenWelcome,
            onboardingStep: localData.currentStep,
            dismissedOnboardingSteps: localData.dismissedSteps,
          });
          console.log('Migrated onboarding state from localStorage to database');
        }
        
        // Clear localStorage after migration attempt
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to migrate localStorage onboarding state:', e);
    }
    
    setHasMigratedLocalStorage(true);
  }, [user, profile, profileLoading, hasMigratedLocalStorage, updateProfile]);

  // Clear local state when profile updates (sync complete)
  useEffect(() => {
    if (profile && localState) {
      // Check if profile matches our local state, if so clear local state
      if (
        profile.hasSeenWelcome === localState.hasSeenWelcome &&
        profile.onboardingStep === localState.currentStep
      ) {
        setLocalState(null);
      }
    }
  }, [profile, localState]);

  const persistState = useCallback(async (newState: OnboardingState) => {
    // Set optimistic local state immediately
    setLocalState(newState);
    
    if (user) {
      // Persist to database for logged-in users
      await updateProfile({
        hasSeenWelcome: newState.hasSeenWelcome,
        onboardingStep: newState.currentStep,
        dismissedOnboardingSteps: newState.dismissedSteps,
      });
    } else {
      // Persist to localStorage for guests
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {
        console.warn('Failed to save onboarding state to localStorage:', e);
      }
    }
  }, [user, updateProfile]);

  const isStepVisible = useCallback((step: OnboardingStep): boolean => {
    if (derivedState.hasCompletedOnboarding) return false;
    if (derivedState.dismissedSteps.includes(step)) return false;
    return derivedState.currentStep === step;
  }, [derivedState]);

  const dismissStep = useCallback((step: OnboardingStep) => {
    const nextStep = getNextStep(step);
    const newState: OnboardingState = {
      ...derivedState,
      dismissedSteps: [...derivedState.dismissedSteps, step],
      currentStep: nextStep,
      hasCompletedOnboarding: nextStep === 'completed',
    };
    persistState(newState);
  }, [derivedState, persistState]);

  const completeOnboarding = useCallback(() => {
    const newState: OnboardingState = {
      ...derivedState,
      hasCompletedOnboarding: true,
      currentStep: 'completed',
    };
    persistState(newState);
  }, [derivedState, persistState]);

  const completeWelcome = useCallback(() => {
    const newState: OnboardingState = {
      ...derivedState,
      hasSeenWelcome: true,
    };
    persistState(newState);
  }, [derivedState, persistState]);

  const resetOnboarding = useCallback(() => {
    persistState(defaultState);
  }, [persistState]);

  const showTour = useCallback(() => {
    const newState: OnboardingState = {
      ...derivedState,
      hasSeenWelcome: false,
      hasCompletedOnboarding: false,
      currentStep: 'welcome',
      dismissedSteps: [],
    };
    persistState(newState);
  }, [derivedState, persistState]);

  const showWelcomeCarousel = !derivedState.hasSeenWelcome;
  const isLoading = user ? profileLoading : false;

  // Don't render children until we know the onboarding state for logged-in users
  if (user && profileLoading) {
    return null;
  }

  return (
    <OnboardingContext.Provider value={{
      state: derivedState,
      showWelcomeCarousel,
      isStepVisible,
      dismissStep,
      completeOnboarding,
      completeWelcome,
      resetOnboarding,
      showTour,
      isLoading,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

function getNextStep(currentStep: OnboardingStep): OnboardingStep {
  const steps: OnboardingStep[] = ['welcome', 'add_drink', 'collections', 'social', 'completed'];
  const currentIndex = steps.indexOf(currentStep);
  return steps[currentIndex + 1] || 'completed';
}
