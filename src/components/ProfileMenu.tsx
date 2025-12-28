import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Bug, Shield } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptics } from '@/hooks/useHaptics';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { BugReportDialog } from '@/components/BugReportDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface ProfileMenuProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string;
  onSignOut: () => void;
}

export function ProfileMenu({ avatarUrl, displayName, email, onSignOut }: ProfileMenuProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { impact, ImpactStyle } = useHaptics();
  const { isAdmin } = useIsAdmin();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  const handleBugReportClick = useCallback(() => {
    impact(ImpactStyle.Light);
    setDrawerOpen(false);
    // Small delay to let the parent drawer close first
    setTimeout(() => {
      setBugReportOpen(true);
    }, 150);
  }, [impact, ImpactStyle]);

  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const handleSettings = () => {
    impact(ImpactStyle.Light);
    setDrawerOpen(false);
    navigate('/settings');
  };

  const handleSignOut = () => {
    impact(ImpactStyle.Medium);
    setDrawerOpen(false);
    onSignOut();
  };

  const AvatarButton = (
    <Button variant="ghost" size="icon" className="text-muted-foreground min-w-[44px] min-h-[44px]">
      <Avatar className="w-9 h-9">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    </Button>
  );

  const MenuContent = (
    <>
      <div className="flex items-center gap-3 px-2 py-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {displayName || email}
          </p>
          {displayName && (
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          )}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild onClick={() => impact(ImpactStyle.Light)}>
          {AvatarButton}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="sr-only">Profile Menu</DrawerTitle>
            {MenuContent}
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-14 text-base"
              onClick={handleSettings}
            >
              <Settings className="w-5 h-5" />
              Settings
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-14 text-base"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/admin');
                }}
              >
                <Shield className="w-5 h-5" />
                Admin Dashboard
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-14 text-base"
              onClick={handleBugReportClick}
            >
              <Bug className="w-5 h-5" />
              Give Feedback
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-14 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      <BugReportDialog
        open={bugReportOpen}
        onOpenChange={setBugReportOpen}
      />
    </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {AvatarButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">
            {displayName || email}
          </p>
          {displayName && (
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin')}>
            <Shield className="w-4 h-4 mr-2" />
            Admin Dashboard
          </DropdownMenuItem>
        )}
        <BugReportDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Bug className="w-4 h-4 mr-2" />
              Give Feedback
            </DropdownMenuItem>
          }
        />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
