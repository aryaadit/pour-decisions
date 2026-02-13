import { useNavigate } from 'react-router-dom';
import { ProfileMenu } from '@/components/ProfileMenu';
import { Button } from '@/components/ui/button';
import { Plus, Activity } from 'lucide-react';

interface HomeHeaderProps {
  appVersion?: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string;
  username?: string | null;
  onAddClick: () => void;
  onSignOut: () => void;
}

export function HomeHeader({
  appVersion,
  avatarUrl,
  displayName,
  email,
  username,
  onAddClick,
  onSignOut,
}: HomeHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow">
              <img src="/app-icon.png" alt="Pour Decisions" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Pour Decisions
                {appVersion && (
                  <span className="ml-2 font-display text-[0.625rem] font-bold text-muted-foreground/70">Beta v{appVersion}</span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Track your favorite drinks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="glow" onClick={onAddClick} className="hidden sm:inline-flex">
              <Plus className="w-4 h-4" />
              <span>Add Drink</span>
            </Button>

            <Button variant="ghost" onClick={() => navigate('/feed')} className="hidden sm:inline-flex">
              <Activity className="w-4 h-4" />
              <span>Feed</span>
            </Button>

            <Button variant="ghost" onClick={() => navigate('/collections')} className="hidden sm:inline-flex">
              <span>Collections</span>
            </Button>

            <ProfileMenu
              avatarUrl={avatarUrl}
              displayName={displayName}
              email={email}
              username={username}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
