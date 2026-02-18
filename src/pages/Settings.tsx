import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useThemeContext } from '@/hooks/ThemeProvider';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useIsMobile } from '@/hooks/useMobile';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import { DrinkType, builtInDrinkTypes, drinkTypeLabels, drinkTypeIcons } from '@/types/drink';
import { SortOrder, sortOrderLabels, ThemePreference } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BottomSheetSelect } from '@/components/ui/BottomSheetSelect';
import { PageHeader } from '@/components/PageHeader';
import { StorageAvatar } from '@/components/StorageAvatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2, Sun, Moon, Monitor, Globe, Users, Lock, Check, X, Settings as SettingsIcon, HelpCircle, MessageSquare, Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ActivityVisibility } from '@/types/social';
import { BugReportDialog } from '@/components/BugReportDialog';
import { CustomDrinkTypeDialog } from '@/components/AddCustomDrinkTypeDialog';
import { CustomDrinkType } from '@/hooks/useCustomDrinkTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDrinks } from '@/hooks/useDrinks';
import { getInitials } from '@/lib/utils';

const Settings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile, uploadAvatar, refetch } = useProfile();
  const { checkUsernameAvailable } = useSocialProfile();
  const { theme, setTheme } = useThemeContext();
  const { customTypes, addCustomType, updateCustomType, deleteCustomType } = useCustomDrinkTypes();
  const { drinks } = useDrinks();
  const { trackEvent } = useAnalytics();
  const { showTour, state: onboardingState } = useOnboarding();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [defaultDrinkType, setDefaultDrinkType] = useState<DrinkType | 'all'>('all');
  const [defaultSortOrder, setDefaultSortOrder] = useState<SortOrder>('date_desc');
  const [themePreference, setThemePreference] = useState<ThemePreference>(theme);
  const [isPublic, setIsPublic] = useState(false);
  const [activityVisibility, setActivityVisibility] = useState<ActivityVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [drinkTypeDialogOpen, setDrinkTypeDialogOpen] = useState(false);
  const [editingDrinkType, setEditingDrinkType] = useState<CustomDrinkType | null>(null);
  const [deleteWarningType, setDeleteWarningType] = useState<CustomDrinkType | null>(null);

  const drinkCountByType = drinks.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setUsername(profile.username || '');
      setDefaultDrinkType(profile.defaultDrinkType || 'all');
      setDefaultSortOrder(profile.defaultSortOrder);
      setThemePreference(profile.themePreference);
      setIsPublic(profile.isPublic || false);
      setActivityVisibility(profile.activityVisibility || 'private');
    }
  }, [profile]);

  // Username validation
  useEffect(() => {
    const validateUsername = async () => {
      const trimmedUsername = username.trim().toLowerCase();
      
      // Reset error if empty or same as current
      if (!trimmedUsername || trimmedUsername === profile?.username?.toLowerCase()) {
        setUsernameError(null);
        return;
      }

      // Format validation
      if (trimmedUsername.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        return;
      }
      if (trimmedUsername.length > 20) {
        setUsernameError('Username must be 20 characters or less');
        return;
      }
      if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        setUsernameError('Only lowercase letters, numbers, and underscores');
        return;
      }

      // Check availability
      setIsCheckingUsername(true);
      const isAvailable = await checkUsernameAvailable(trimmedUsername);
      setIsCheckingUsername(false);

      if (!isAvailable) {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError(null);
      }
    };

    const debounce = setTimeout(validateUsername, 300);
    return () => clearTimeout(debounce);
  }, [username, profile?.username, checkUsernameAvailable]);

  // Apply drink type theme
  useEffect(() => {
    document.documentElement.setAttribute('data-drink-theme', defaultDrinkType);
    return () => {
      document.documentElement.removeAttribute('data-drink-theme');
    };
  }, [defaultDrinkType]);

  const handleSaveDrinkType = async (name: string, icon: string, color: string) => {
    if (editingDrinkType) {
      const result = await updateCustomType(editingDrinkType.id, { name, icon, color });
      if (result?.error) return { error: result.error };
      toast.success('Drink type updated');
    } else {
      const result = await addCustomType(name, icon, color);
      if (result?.error) return { error: result.error };
      toast.success('Drink type added');
    }
    return null;
  };

  const handleDeleteDrinkType = async (ct: CustomDrinkType) => {
    const count = drinkCountByType[ct.name] || 0;
    if (count > 0) {
      setDeleteWarningType(ct);
    } else {
      const result = await deleteCustomType(ct.id);
      if (result?.error) {
        toast.error('Failed to delete', { description: result.error });
      } else {
        toast.success('Drink type removed');
      }
    }
  };

  const confirmDeleteDrinkType = async () => {
    if (!deleteWarningType) return;
    const result = await deleteCustomType(deleteWarningType.id);
    if (result?.error) {
      toast.error('Failed to delete', { description: result.error });
    } else {
      toast.success('Drink type removed', {
        description: `Drinks will keep their type but won't have a filter chip.`,
      });
    }
    setDeleteWarningType(null);
  };

  const handleSave = async () => {
    // Validate username before saving
    if (usernameError) {
      toast.error('Invalid username', { description: usernameError });
      return;
    }

    setIsSaving(true);
    const trimmedUsername = username.trim().toLowerCase() || null;
    
    const { error } = await updateProfile({
      displayName: displayName || null,
      username: trimmedUsername,
      defaultDrinkType: defaultDrinkType === 'all' ? null : defaultDrinkType,
      defaultSortOrder,
      themePreference,
      isPublic,
      activityVisibility,
    });
    setIsSaving(false);

    if (error) {
      toast.error('Error', { description: 'Failed to save settings.' });
    } else {
      trackEvent('settings_saved', 'action', {
        theme_changed: themePreference !== profile?.themePreference,
        default_filter_changed: defaultDrinkType !== (profile?.defaultDrinkType || 'all'),
        privacy_changed: isPublic !== profile?.isPublic || activityVisibility !== profile?.activityVisibility,
        username_changed: trimmedUsername !== profile?.username,
      });
      await refetch();
      toast.success('Settings saved', { description: 'Your preferences have been updated.' });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', { description: 'Please select an image file.' });
      return;
    }

    setIsUploading(true);
    const { error } = await uploadAvatar(file);
    setIsUploading(false);

    if (error) {
      toast.error('Upload failed', { description: 'Failed to upload avatar.' });
    } else {
      toast.success('Avatar updated', { description: 'Your profile picture has been changed.' });
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Settings"
        icon={<SettingsIcon className="h-5 w-5" />}
        showBack={true}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Profile & Social Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile & Social</CardTitle>
            <CardDescription>Manage your identity and social presence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Identity subsection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Identity</h3>
              
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <StorageAvatar
                    storagePath={profile?.avatarUrl}
                    fallback={isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : getInitials(displayName)}
                    className="w-20 h-20 cursor-pointer"
                    onClick={handleAvatarClick}
                  />
                  <div 
                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={handleAvatarClick}
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="your_username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    className={`pl-7 pr-10 ${usernameError ? 'border-destructive' : username && !isCheckingUsername && !usernameError ? 'border-green-500' : ''}`}
                    maxLength={20}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!isCheckingUsername && username && !usernameError && <Check className="w-4 h-4 text-green-500" />}
                    {!isCheckingUsername && usernameError && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {usernameError && (
                  <p className="text-sm text-destructive mt-1">{usernameError}</p>
                )}
                {!usernameError && username && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="px-0 h-auto text-primary"
                    onClick={() => navigate(`/u/${username}`)}
                  >
                    View public profile →
                  </Button>
                )}
              </div>
            </div>

            {/* Privacy & Visibility subsection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Privacy & Visibility</h3>
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">Profile Discoverability</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to find you by username
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <div>
                <Label>Activity Visibility</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Who can see your drink activity in their feed
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { value: 'private', icon: Lock, label: 'Private', description: 'Only you' },
                    { value: 'followers', icon: Users, label: 'Followers', description: 'People who follow you' },
                    { value: 'public', icon: Globe, label: 'Public', description: 'Everyone' },
                  ].map(({ value, icon: Icon, label, description }) => (
                    <Button
                      key={value}
                      variant={activityVisibility === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityVisibility(value as ActivityVisibility)}
                      className="justify-start h-auto py-3 px-4"
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">{label}</div>
                        <div className="text-xs opacity-70">{description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Theme</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={themePreference === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setThemePreference(value as ThemePreference);
                      setTheme(value as ThemePreference);
                    }}
                    className="flex-1"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="defaultDrinkType">Default Drink Filter</Label>
              <BottomSheetSelect
                value={defaultDrinkType}
                onValueChange={(v) => setDefaultDrinkType(v as DrinkType | 'all')}
                placeholder="Default Drink Filter"
                triggerClassName="mt-1"
                options={[
                  { value: 'all', label: 'All drinks', icon: '🍹' },
                  ...builtInDrinkTypes.map((type) => ({
                    value: type,
                    label: drinkTypeLabels[type],
                    icon: drinkTypeIcons[type],
                  })),
                  ...customTypes.map((ct) => ({
                    value: ct.name,
                    label: ct.name,
                    icon: ct.icon,
                  })),
                ]}
              />
            </div>

            <div>
              <Label htmlFor="defaultSortOrder">Default Sort Order</Label>
              <BottomSheetSelect
                value={defaultSortOrder}
                onValueChange={(v) => setDefaultSortOrder(v as SortOrder)}
                placeholder="Default Sort Order"
                triggerClassName="mt-1"
                options={Object.entries(sortOrderLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Drink Types Section */}
        <Card>
          <CardHeader>
            <CardTitle>Drink Types</CardTitle>
            <CardDescription>Manage built-in and custom drink types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Built-in types */}
            {builtInDrinkTypes.map((type) => (
              <div key={type} className="flex items-center gap-3 px-2 py-2.5 rounded-lg">
                <span className="text-lg">{drinkTypeIcons[type]}</span>
                <span className="flex-1 text-sm font-medium">{drinkTypeLabels[type]}</span>
                <span className="text-xs text-muted-foreground">Built-in</span>
              </div>
            ))}

            {/* Custom types */}
            {customTypes.map((ct) => (
              <div key={ct.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg group">
                <span className="text-lg">{ct.icon}</span>
                <span className="flex-1 text-sm font-medium">{ct.name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingDrinkType(ct);
                      setDrinkTypeDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDrinkType(ct)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 border-dashed"
              onClick={() => {
                setEditingDrinkType(null);
                setDrinkTypeDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Type
            </Button>
          </CardContent>
        </Card>

        <CustomDrinkTypeDialog
          open={drinkTypeDialogOpen}
          onOpenChange={(open) => {
            setDrinkTypeDialogOpen(open);
            if (!open) setEditingDrinkType(null);
          }}
          onSave={handleSaveDrinkType}
          editingType={editingDrinkType}
        />

        <AlertDialog open={!!deleteWarningType} onOpenChange={(open) => !open && setDeleteWarningType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Delete "{deleteWarningType?.name}"?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This drink type has <strong>{drinkCountByType[deleteWarningType?.name || ''] || 0} drink{(drinkCountByType[deleteWarningType?.name || ''] || 0) !== 1 ? 's' : ''}</strong> assigned to it.
                Those drinks will keep their type but won't have a filter chip.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteDrinkType}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
            <CardDescription>Learn how to use the app or share feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              onClick={() => {
                showTour();
                navigate('/');
                toast.success('Tour started!', { description: 'Follow the tips to learn the app.' });
              }}
              className="w-full"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Take a tour
            </Button>
            <BugReportDialog 
              trigger={
                <Button variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Give Feedback
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Changes
        </Button>

        {/* Footer Links */}
        <div className="flex justify-center pt-4 pb-8">
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/privacy')}
            className="text-muted-foreground hover:text-foreground"
          >
            Privacy Policy
          </Button>
        </div>

        {isMobile && <div className="h-20" />}
      </main>
    </div>
  );
};

export default Settings;
