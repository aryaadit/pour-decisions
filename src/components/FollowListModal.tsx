import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wine, User, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: 'Followers' | 'Following';
  users: PublicProfile[];
  isLoading: boolean;
}

interface UserWithDrinkMatch extends PublicProfile {
  matchedDrink?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [drinkSearchResults, setDrinkSearchResults] = useState<Map<string, string>>(new Map());
  const [isSearchingDrinks, setIsSearchingDrinks] = useState(false);
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search drinks for matching users
  useEffect(() => {
    const searchDrinks = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setDrinkSearchResults(new Map());
        return;
      }

      const userIds = users.map(u => u.userId);
      if (userIds.length === 0) return;

      setIsSearchingDrinks(true);
      
      const { data } = await supabase
        .from('drinks_public')
        .select('user_id, name')
        .in('user_id', userIds)
        .ilike('name', `%${debouncedQuery}%`)
        .limit(100);

      if (data) {
        const matchMap = new Map<string, string>();
        data.forEach(drink => {
          if (drink.user_id && drink.name && !matchMap.has(drink.user_id)) {
            matchMap.set(drink.user_id, drink.name);
          }
        });
        setDrinkSearchResults(matchMap);
      }
      
      setIsSearchingDrinks(false);
    };

    searchDrinks();
  }, [debouncedQuery, users]);

  // Filter users by name/username OR by drink matches
  const filteredUsers = useMemo((): UserWithDrinkMatch[] => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return users;
    }

    const query = debouncedQuery.toLowerCase();
    const results: UserWithDrinkMatch[] = [];
    
    users.forEach(u => {
      const nameMatch = 
        u.displayName?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query);
      const drinkMatch = drinkSearchResults.get(u.userId);
      
      if (nameMatch || drinkMatch) {
        results.push({ ...u, matchedDrink: drinkMatch });
      }
    });
    
    return results;
  }, [users, debouncedQuery, drinkSearchResults]);

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setDrinkSearchResults(new Map());
    }
  }, [open]);

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

  const searchInput = (
    <div className="px-4 py-4 border-b border-border/30">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or drink..."
          className="pl-10 pr-10 bg-secondary/50"
        />
        {(searchQuery || isSearchingDrinks) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearchingDrinks && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchQuery && !isSearchingDrinks && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {debouncedQuery.length >= 2 && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Names</span>
          <span className="text-border">•</span>
          <Wine className="h-3 w-3" />
          <span>Drinks logged</span>
        </div>
      )}
    </div>
  );

  const userList = (
    <ScrollArea className="h-[60vh] max-h-[400px]">
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
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-base">
            {debouncedQuery.length >= 2
              ? 'No matches found'
              : title === 'Followers' 
                ? 'No followers yet' 
                : 'Not following anyone yet'}
          </p>
        </div>
      ) : (
        <div className="p-2 divide-y divide-border/30">
          {filteredUsers.map((profile) => (
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
                  {profile.matchedDrink && (
                    <Badge variant="secondary" className="mt-1 text-xs truncate max-w-[180px]">
                      <Wine className="h-3 w-3 mr-1" />
                      {profile.matchedDrink}
                    </Badge>
                  )}
                </div>
              </button>
              
              {user?.id !== profile.userId && (
                <FollowButton
                  userId={profile.userId}
                  username={profile.username}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 shrink-0"
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
          {searchInput}
          {userList}
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
        {searchInput}
        {userList}
      </DialogContent>
    </Dialog>
  );
}
