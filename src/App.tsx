import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/ThemeProvider";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageTransition } from "@/components/PageTransition";
import BottomNavigation from "@/components/BottomNavigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import AddDrink from "./pages/AddDrink";
import Admin from "./pages/Admin";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import SharedCollection from "./pages/SharedCollection";
import Feed from "./pages/Feed";
import UserProfile from "./pages/UserProfile";
import StoreListing from "./pages/StoreListing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Routes where bottom nav should NOT appear
const ROUTES_WITHOUT_NAV = ['/auth', '/reset-password', '/share/', '/c/', '/store-listing', '/privacy'];

function AnimatedRoutes() {
  const location = useLocation();
  const isMobile = useIsMobile();

  const shouldShowNav = isMobile && !ROUTES_WITHOUT_NAV.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  return (
    <div className="relative min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/add-drink" element={<AddDrink />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:id" element={<CollectionDetail />} />
            <Route path="/share/:shareId" element={<SharedCollection />} />
            <Route path="/c/:shareId" element={<SharedCollection />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/u/:username" element={<UserProfile />} />
            <Route path="/store-listing" element={<StoreListing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>

      {/* Persistent bottom navigation - always visible on mobile */}
      {shouldShowNav && <BottomNavigation />}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <OnboardingProvider>
            <Toaster />
            <BrowserRouter>
              <AnalyticsProvider>
                <AnimatedRoutes />
              </AnalyticsProvider>
            </BrowserRouter>
          </OnboardingProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
