import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { PublicProfile } from '@/types/social';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface UserSearchProps {
  onSelect?: (profile: PublicProfile) => void;
  placeholder?: string;
  className?: string;
}

export function UserSearch({ 
  onSelect, 
  placeholder = "Search users...",
  className 
}: UserSearchProps) {
  const navigate = useNavigate();
  const { searchUsers, isLoading } = useSocialProfile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length >= 2) {
        const profiles = await searchUsers(debouncedQuery);
        setResults(profiles);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    };

    search();
  }, [debouncedQuery, searchUsers]);

  const handleSelect = (profile: PublicProfile) => {
    if (onSelect) {
      onSelect(profile);
    } else if (profile.username) {
      navigate(`/u/${profile.username}`);
    }
    setQuery('');
    setIsOpen(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((profile) => (
            <button
              key={profile.userId}
              onClick={() => handleSelect(profile)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
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
                {profile.username && profile.displayName && (
                  <p className="text-sm text-muted-foreground truncate">
                    @{profile.username}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && results.length === 0 && debouncedQuery.length >= 2 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
          No users found
        </div>
      )}
    </div>
  );
}
