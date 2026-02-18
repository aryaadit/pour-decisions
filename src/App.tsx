import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/ThemeProvider";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { useIsMobile } from "@/hooks/useMobile";
import BottomNavigation from "@/components/BottomNavigation";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, setupCachePersistence } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

// Core tabs — eagerly loaded for instant bottom-nav switching
import Index from "./pages/Index";
import Collections from "./pages/Collections";
import Feed from "./pages/Feed";

// All other routes — lazy-loaded to reduce initial bundle
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));
const AddDrink = lazy(() => import("./pages/AddDrink"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const CollectionSettings = lazy(() => import("./pages/CollectionSettings"));
const SharedCollection = lazy(() => import("./pages/SharedCollection"));
const StoreListing = lazy(() => import("./pages/StoreListing"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Routes where bottom nav should NOT appear
const ROUTES_WITHOUT_NAV = ['/auth', '/reset-password', '/share/', '/c/', '/store-listing', '/privacy'];

function AppRoutes() {
  const location = useLocation();
  const isMobile = useIsMobile();

  const shouldShowNav = isMobile && !ROUTES_WITHOUT_NAV.some(route =>
    location.pathname === route || location.pathname.startsWith(route)
  );

  return (
    <div className="relative min-h-screen bg-background">
      <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            {/* Core tabs — eagerly loaded */}
            <Route path="/" element={<ErrorBoundary><Index /></ErrorBoundary>} />
            <Route path="/collections" element={<ErrorBoundary><Collections /></ErrorBoundary>} />
            <Route path="/feed" element={<ErrorBoundary><Feed /></ErrorBoundary>} />

            {/* Lazy-loaded routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            <Route path="/add-drink" element={<ErrorBoundary><AddDrink /></ErrorBoundary>} />
            <Route path="/u/:username" element={<ErrorBoundary><UserProfile /></ErrorBoundary>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/collections/:id" element={<ErrorBoundary><CollectionDetail /></ErrorBoundary>} />
            <Route path="/collections/:id/settings" element={<ErrorBoundary><CollectionSettings /></ErrorBoundary>} />
            <Route path="/share/:shareId" element={<SharedCollection />} />
            <Route path="/c/:shareId" element={<SharedCollection />} />
            <Route path="/store-listing" element={<StoreListing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      {/* Persistent bottom navigation - always visible on mobile */}
      {shouldShowNav && <BottomNavigation />}
    </div>
  );
}

const App = () => {
  useEffect(() => {
    setupCachePersistence();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <OnboardingProvider>
              <Toaster />
              <OfflineBanner />
              <BrowserRouter>
                <AnalyticsProvider>
                  <AppRoutes />
                </AnalyticsProvider>
              </BrowserRouter>
            </OnboardingProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
