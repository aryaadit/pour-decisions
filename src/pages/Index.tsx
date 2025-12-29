import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrinks } from '@/hooks/useDrinks';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useThemeContext } from '@/hooks/ThemeProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppInfo } from '@/hooks/useAppInfo';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { DrinkType, Drink, isBuiltInDrinkType } from '@/types/drink';
import { SortOrder } from '@/types/profile';
import { DrinkListItem } from '@/components/DrinkListItem';
import { DrinkListItemSkeleton } from '@/components/DrinkListItemSkeleton';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { DrinkTypeFilter } from '@/components/DrinkTypeFilter';
import { SortSelector } from '@/components/SortSelector';
import { SearchBar } from '@/components/SearchBar';
import { AddDrinkDialog } from '@/components/AddDrinkDialog';
import { EmptyState } from '@/components/EmptyState';
import { ProfileMenu } from '@/components/ProfileMenu';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

// Helper to convert hex to HSL for CSS variables
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 50%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const Index = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { setTheme } = useThemeContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const appInfo = useAppInfo();
  const { drinks, isLoading, addDrink, updateDrink, deleteDrink, filterDrinks, getDrinkCountByType, migrateDrinksToOther } = useDrinks();
  const { customTypes } = useCustomDrinkTypes();
  const [selectedType, setSelectedType] = useState<DrinkType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date_desc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [viewingDrink, setViewingDrink] = useState<Drink | null>(null);

  // Sync profile theme preference
  useEffect(() => {
    if (profile?.themePreference) {
      setTheme(profile.themePreference);
    }
  }, [profile?.themePreference, setTheme]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Apply drink type theme
  useEffect(() => {
    const root = document.documentElement;
    
    // Check if it's a custom type
    if (selectedType && !isBuiltInDrinkType(selectedType)) {
      const customType = customTypes.find(ct => ct.name === selectedType);
      if (customType) {
        // Remove the data attribute first to prevent conflicts
        root.setAttribute('data-drink-theme', 'custom');
        
        // Apply custom color as CSS variables with !important via style
        const hsl = hexToHsl(customType.color);
        root.style.setProperty('--primary', hsl, 'important');
        root.style.setProperty('--accent', hsl, 'important');
        root.style.setProperty('--ring', hsl, 'important');
        root.style.setProperty('--shadow-glow', `0 0 40px hsl(${hsl} / 0.2)`, 'important');
        root.style.setProperty('--theme-gradient', `radial-gradient(ellipse at top, hsl(${hsl} / 0.15) 0%, hsl(20 14% 8%) 70%)`, 'important');
        return;
      }
    }
    
    // Built-in type or "all" - use CSS attribute selector
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--shadow-glow');
    root.style.removeProperty('--theme-gradient');
    const theme = selectedType || 'all';
    root.setAttribute('data-drink-theme', theme);
    
    return () => {
      root.setAttribute('data-drink-theme', 'all');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--shadow-glow');
      root.style.removeProperty('--theme-gradient');
    };
  }, [selectedType, customTypes]);

  // Apply profile defaults when loaded
  useEffect(() => {
    if (profile?.defaultDrinkType && selectedType === null) {
      setSelectedType(profile.defaultDrinkType);
    }
    if (profile?.defaultSortOrder) {
      setSortOrder(profile.defaultSortOrder);
    }
  }, [profile?.defaultDrinkType, profile?.defaultSortOrder]);

  const filteredDrinks = useMemo(() => {
    const filtered = filterDrinks(selectedType ?? undefined, searchQuery);
    
    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'date_desc':
          return b.dateAdded.getTime() - a.dateAdded.getTime();
        case 'date_asc':
          return a.dateAdded.getTime() - b.dateAdded.getTime();
        case 'rating_desc':
          return b.rating - a.rating;
        case 'rating_asc':
          return a.rating - b.rating;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [filterDrinks, selectedType, searchQuery, sortOrder]);

  const drinkCountByType = useMemo(() => getDrinkCountByType(), [drinks]);

  const hasFilters = !!selectedType || !!searchQuery;


  const handleSave = async (drinkData: Omit<Drink, 'id' | 'dateAdded'>) => {
    if (editingDrink) {
      await updateDrink(editingDrink.id, drinkData);
      toast.success('Drink updated', { description: `${drinkData.name} has been updated.` });
    } else {
      await addDrink(drinkData);
      toast.success('Drink added', { description: `${drinkData.name} has been added to your collection.` });
    }
    setEditingDrink(null);
  };

  const handleAddClick = useCallback(() => {
    if (isMobile) {
      const typeParam = selectedType || profile?.defaultDrinkType || 'whiskey';
      navigate(`/add-drink?type=${typeParam}`);
    } else {
      setDialogOpen(true);
    }
  }, [isMobile, navigate, selectedType, profile?.defaultDrinkType]);

  const handleEdit = (drink: Drink) => {
    if (isMobile) {
      navigate(`/add-drink?edit=${drink.id}`);
    } else {
      setEditingDrink(drink);
      setDialogOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const drink = drinks.find(d => d.id === id);
    await deleteDrink(id);
    toast.success('Drink removed', { description: `${drink?.name} has been removed from your collection.` });
  };

  const handleClearFilters = () => {
    setSelectedType(null);
    setSearchQuery('');
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDrink(null);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.warn('Sign out error (proceeding anyway):', error.message);
    }
    toast.success('Signed out', { description: 'You have been signed out successfully.' });
    navigate('/auth');
  };

  if (authLoading || isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header skeleton */}
        <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl shimmer" />
                <div className="space-y-2">
                  <div className="h-5 w-32 rounded shimmer" />
                  <div className="h-3 w-24 rounded shimmer hidden sm:block" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-28 rounded-lg shimmer hidden sm:block" />
                <div className="w-10 h-10 rounded-full shimmer" />
              </div>
            </div>
          </div>
        </header>

        {/* Main content skeleton */}
        <main className="container mx-auto px-4 py-6">
          {/* Search bar skeleton */}
          <div className="h-10 w-full rounded-lg shimmer mb-4" />
          
          {/* Filters skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-20 rounded-lg shimmer flex-shrink-0" />
              ))}
            </div>
            <div className="h-10 w-36 rounded-lg shimmer" />
          </div>

          {/* Drink list skeleton */}
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <DrinkListItemSkeleton key={i} style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                  {appInfo && (
                    <span className="ml-2 font-display text-[0.625rem] font-bold text-muted-foreground/70">Beta v{appInfo.version}</span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Track your favorite drinks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop add button */}
              <Button variant="glow" onClick={handleAddClick} className="hidden sm:inline-flex">
                <Plus className="w-4 h-4" />
                <span>Add Drink</span>
              </Button>

              <ProfileMenu
                avatarUrl={profile?.avatarUrl}
                displayName={profile?.displayName}
                email={user.email}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, brand, or notes..."
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <DrinkTypeFilter
              selectedType={selectedType}
              onSelectType={setSelectedType}
              drinkCountByType={drinkCountByType}
              onMigrateDrinksToOther={migrateDrinksToOther}
            />
            <SortSelector value={sortOrder} onChange={setSortOrder} />
          </div>
        </div>

        {/* Stats */}
        {drinks.length > 0 && (
          <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
            <span>{filteredDrinks.length} drink{filteredDrinks.length !== 1 ? 's' : ''}</span>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Drink List */}
        {filteredDrinks.length > 0 ? (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {filteredDrinks.map((drink, index) => (
              <DrinkListItem
                key={drink.id}
                drink={drink}
                onClick={() => setViewingDrink(drink)}
                style={{ animationDelay: `${index * 30}ms` }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilters={hasFilters}
            onAddClick={handleAddClick}
            onClearFilters={handleClearFilters}
          />
        )}
      </main>

      {/* Mobile FAB */}
      <Button
        variant="glow"
        size="icon"
        onClick={handleAddClick}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40 animate-pulse-glow"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Add/Edit Dialog - Desktop only */}
      {!isMobile && (
        <AddDrinkDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSave={handleSave}
          editDrink={editingDrink}
          defaultType={selectedType || profile?.defaultDrinkType || 'whiskey'}
        />
      )}

      {/* Detail Modal */}
      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => {
          if (!open) {
            setViewingDrink(null);
          }
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Index;
