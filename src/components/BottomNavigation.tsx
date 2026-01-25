import { Home, Plus, User, FolderOpen, Activity } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import { useProfile } from "@/hooks/useProfile";
import { ImpactStyle } from "@capacitor/haptics";

interface BottomNavigationProps {
  onSearchFocus?: () => void;
}

const BottomNavigation = ({ onSearchFocus }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { impact } = useHaptics();
  const { profile } = useProfile();

  // Profile path depends on whether user has a username set
  const profilePath = profile?.username ? `/u/${profile.username}` : '/settings';

  const tabs = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    { id: "feed", icon: Activity, label: "Feed", path: "/feed" },
    { id: "add", icon: Plus, label: "Add", path: "/add-drink" },
    { id: "collections", icon: FolderOpen, label: "Collections", path: "/collections" },
    { id: "profile", icon: User, label: "Profile", path: profilePath },
  ];

  const handleTabPress = async (tab: typeof tabs[0]) => {
    await impact(ImpactStyle.Light);
    
    if (tab.path) {
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.id === 'profile') {
      // Profile is active on user profile page or settings
      return location.pathname.startsWith('/u/') || location.pathname === '/settings';
    }
    if (tab.path) {
      return location.pathname === tab.path;
    }
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Backdrop blur background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
      
      {/* Safe area padding for devices with home indicator */}
      <div className="relative flex items-end justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          const isAddButton = tab.id === "add";

          if (isAddButton) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab)}
                className="flex flex-col items-center justify-center relative -mt-5"
              >
                {/* Elevated pill button like United's Travel */}
                <div className="flex flex-col items-center bg-primary rounded-full px-5 py-2.5 shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                  <span className="text-[10px] font-semibold text-primary-foreground mt-0.5">
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl transition-all duration-200",
                "active:scale-95",
                active && "text-primary",
                !active && "text-muted-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-8 rounded-full transition-colors",
                active && "bg-primary/10"
              )}>
                <Icon className={cn("w-5 h-5", active && "text-primary")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
