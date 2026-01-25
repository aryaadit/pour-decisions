import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FollowButton } from '@/components/FollowButton';
import { PublicProfile } from '@/types/social';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: 'Followers' | 'Following';
  users: PublicProfile[];
  isLoading: boolean;
}

export function FollowListModal({
  open,
  onOpenChange,
  title,
  users,
  isLoading,
}: FollowListModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleUserClick = (username: string | null) => {
    if (username) {
      onOpenChange(false);
      navigate(`/u/${username}`);
    }
  };

  const content = (
    <ScrollArea className="h-[70vh] max-h-[500px]">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-base">
            {title === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
          </p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {users.map((profile) => (
            <div
              key={profile.userId}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors"
            >
              <button
                onClick={() => handleUserClick(profile.username)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <Avatar className="h-12 w-12 ring-2 ring-border/50">
                  <AvatarImage src={profile.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(profile.displayName || profile.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {profile.displayName || profile.username}
                  </p>
                  {profile.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{profile.username}
                    </p>
                  )}
                </div>
              </button>
              
              {user?.id !== profile.userId && (
                <FollowButton
                  userId={profile.userId}
                  username={profile.username}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-center text-lg font-semibold">
              {title}
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
