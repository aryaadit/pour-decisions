import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

type OnboardingStep = 
  | 'welcome'
  | 'add_drink'
  | 'collections'
  | 'social'
  | 'completed';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: OnboardingStep;
  dismissedSteps: OnboardingStep[];
}

interface OnboardingContextType {
  state: OnboardingState;
  isStepVisible: (step: OnboardingStep) => boolean;
  dismissStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  showTour: () => void;
}

const STORAGE_KEY = 'barkeeply_onboarding';

const defaultState: OnboardingState = {
  hasCompletedOnboarding: false,
  currentStep: 'welcome',
  dismissedSteps: [],
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setState(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load onboarding state:', e);
    }
    setIsLoaded(true);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save onboarding state:', e);
      }
    }
  }, [state, isLoaded]);

  const isStepVisible = useCallback((step: OnboardingStep): boolean => {
    if (state.hasCompletedOnboarding) return false;
    if (state.dismissedSteps.includes(step)) return false;
    return state.currentStep === step;
  }, [state]);

  const dismissStep = useCallback((step: OnboardingStep) => {
    setState(prev => {
      const nextStep = getNextStep(step);
      return {
        ...prev,
        dismissedSteps: [...prev.dismissedSteps, step],
        currentStep: nextStep,
        hasCompletedOnboarding: nextStep === 'completed',
      };
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
      currentStep: 'completed',
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
  }, []);

  const showTour = useCallback(() => {
    setState({
      hasCompletedOnboarding: false,
      currentStep: 'welcome',
      dismissedSteps: [],
    });
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <OnboardingContext.Provider value={{
      state,
      isStepVisible,
      dismissStep,
      completeOnboarding,
      resetOnboarding,
      showTour,
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
