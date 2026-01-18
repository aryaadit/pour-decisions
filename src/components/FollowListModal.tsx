import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FollowButton } from '@/components/FollowButton';
import { PublicProfile } from '@/types/social';
import { useAuth } from '@/hooks/useAuth';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {title === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
            </div>
          ) : (
            <div className="p-2">
              {users.map((profile) => (
                <div
                  key={profile.userId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => handleUserClick(profile.username)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(profile.displayName || profile.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
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
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
