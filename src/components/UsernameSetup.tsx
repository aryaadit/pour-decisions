import { useState, useEffect } from 'react';
import { Check, X, Loader2, AtSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useProfile } from '@/hooks/useProfile';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UsernameSetupProps {
  open: boolean;
  onComplete: () => void;
}

export function UsernameSetup({ open, onComplete }: UsernameSetupProps) {
  const { checkUsernameAvailable, updateSocialProfile } = useSocialProfile();
  const { profile } = useProfile();
  
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedUsername = useDebounce(username, 500);

  // Validate username format
  const isValidFormat = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!isValidFormat) {
        setIsAvailable(null);
        return;
      }

      setIsChecking(true);
      const available = await checkUsernameAvailable(debouncedUsername);
      setIsAvailable(available);
      setIsChecking(false);
    };

    if (debouncedUsername.length >= 3) {
      checkAvailability();
    } else {
      setIsAvailable(null);
    }
  }, [debouncedUsername, checkUsernameAvailable, isValidFormat]);

  const handleSubmit = async () => {
    if (!isAvailable || !isValidFormat) return;

    setIsSaving(true);
    
    const { error } = await updateSocialProfile({
      username: username.toLowerCase(),
      bio: bio.trim() || undefined,
      isPublic: true, // Default to public when setting up username
      activityVisibility: 'followers', // Default to followers-only
    });

    if (error) {
      toast.error('Failed to save username');
      setIsSaving(false);
      return;
    }

    toast.success('Profile set up successfully!');
    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Set up your profile</DialogTitle>
          <DialogDescription>
            Choose a username so friends can find and follow you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="drinkexplorer"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={cn(
                  "pl-10 pr-10",
                  isAvailable === true && "border-green-500 focus-visible:ring-green-500",
                  isAvailable === false && "border-destructive focus-visible:ring-destructive"
                )}
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!isChecking && isAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                {!isChecking && isAvailable === false && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {username.length < 3 
                ? "Must be 3-20 characters" 
                : !isValidFormat 
                  ? "Only letters, numbers, and underscores"
                  : isAvailable === false 
                    ? "This username is taken"
                    : isAvailable === true 
                      ? "Username is available!"
                      : "Checking availability..."}
            </p>
          </div>

          {/* Bio Input */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea
              id="bio"
              placeholder="Wine lover, craft beer enthusiast, always hunting for the perfect cocktail..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/160
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isAvailable || !isValidFormat || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
