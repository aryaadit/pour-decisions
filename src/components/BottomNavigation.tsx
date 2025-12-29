import { Wine, Heart, Plus, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import { ImpactStyle } from "@capacitor/haptics";

interface BottomNavigationProps {
  onSearchFocus?: () => void;
}

const BottomNavigation = ({ onSearchFocus }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { impact } = useHaptics();

  const tabs = [
    { id: "drinks", icon: Wine, label: "Drinks", path: "/" },
    { id: "favorites", icon: Heart, label: "Favorites", path: "/favorites" },
    { id: "add", icon: Plus, label: "Add", path: "/add-drink" },
    { id: "profile", icon: User, label: "Profile", path: "/settings" },
  ];

  const handleTabPress = async (tab: typeof tabs[0]) => {
    await impact(ImpactStyle.Light);
    
    if (tab.path) {
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.path) {
      return location.pathname === tab.path;
    }
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Backdrop blur background */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border/50" />
      
      {/* Safe area padding for devices with home indicator */}
      <div className="relative flex items-center justify-around px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          const isFavorites = tab.id === "favorites";

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] min-h-[52px] rounded-2xl transition-all duration-200",
                "active:scale-95 active:bg-muted/50",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-8 rounded-full transition-colors",
                active && "bg-primary/15"
              )}>
                <Icon className={cn(
                  "w-6 h-6 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                  isFavorites && active && "fill-current text-red-500"
                )} />
              </div>
              <span className={cn(
                "text-[11px] font-medium mt-1 transition-colors",
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
