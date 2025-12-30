import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsContextType {
  trackEvent: (
    eventName: string,
    category: 'action' | 'page_view' | 'error' | 'engagement',
    properties?: Record<string, unknown>
  ) => void;
  trackPageView: (pageName: string, properties?: Record<string, unknown>) => void;
  trackError: (errorMessage: string, context?: Record<string, unknown>) => void;
  trackClick: (element: string, context?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

const routeNameMap: Record<string, string> = {
  '/': 'Home',
  '/auth': 'Auth',
  '/reset-password': 'Reset Password',
  '/settings': 'Settings',
  '/add-drink': 'Add Drink',
  '/admin': 'Admin',
};

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const analytics = useAnalytics();
  const location = useLocation();

  // Track page views automatically on route change
  useEffect(() => {
    const pageName = routeNameMap[location.pathname] || location.pathname;
    analytics.trackPageView(pageName);
  }, [location.pathname, analytics.trackPageView]);

  // Track session start
  useEffect(() => {
    analytics.trackEvent('session_start', 'engagement', {
      referrer: document.referrer || 'direct',
    });
  }, []);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      analytics.trackError(event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'unhandled_error',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError(
        event.reason?.message || 'Unhandled promise rejection',
        { type: 'unhandled_rejection' }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [analytics.trackError]);

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
}
