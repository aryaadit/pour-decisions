import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrinks } from '@/hooks/useDrinks';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useThemeContext } from '@/hooks/ThemeProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppInfo } from '@/hooks/useAppInfo';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { useOnboarding } from '@/hooks/useOnboarding';
import { DrinkType, Drink, isBuiltInDrinkType } from '@/types/drink';
import { SortOrder } from '@/types/profile';
import { hexToHsl } from '@/lib/utils';
import { MemoizedDrinkListItem } from '@/components/MemoizedDrinkListItem';
import { DrinkListItemSkeleton } from '@/components/DrinkListItemSkeleton';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { AddDrinkDialog } from '@/components/AddDrinkDialog';
import { EmptyState } from '@/components/EmptyState';
import { TestFlightBanner } from '@/components/TestFlightBanner';
const WelcomeCarousel = lazy(() =>
  import('@/components/WelcomeCarousel').then(mod => ({ default: mod.WelcomeCarousel }))
);
import { HomeHeader } from '@/components/home/HomeHeader';
import { OnboardingSection } from '@/components/home/OnboardingSection';
import { SearchAndFilterBar } from '@/components/home/SearchAndFilterBar';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';

const Index = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { setTheme } = useThemeContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const appInfo = useAppInfo();
  const { isStepVisible, dismissStep, showWelcomeCarousel, completeWelcome } = useOnboarding();
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

    if (selectedType && !isBuiltInDrinkType(selectedType)) {
      const customType = customTypes.find(ct => ct.name === selectedType);
      if (customType) {
        root.setAttribute('data-drink-theme', 'custom');
        const hsl = hexToHsl(customType.color);
        root.style.setProperty('--primary', hsl, 'important');
        root.style.setProperty('--accent', hsl, 'important');
        root.style.setProperty('--ring', hsl, 'important');
        root.style.setProperty('--shadow-glow', `0 0 40px hsl(${hsl} / 0.2)`, 'important');
        root.style.setProperty('--theme-gradient', `radial-gradient(ellipse at top, hsl(${hsl} / 0.15) 0%, hsl(20 14% 8%) 70%)`, 'important');
        return;
      }
    }

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
        case 'date_desc': return b.dateAdded.getTime() - a.dateAdded.getTime();
        case 'date_asc': return a.dateAdded.getTime() - b.dateAdded.getTime();
        case 'rating_desc': return b.rating - a.rating;
        case 'rating_asc': return a.rating - b.rating;
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });
  }, [filterDrinks, selectedType, searchQuery, sortOrder]);

  const drinkCountByType = useMemo(() => getDrinkCountByType(), [drinks]);
  const totalDrinks = drinks.length;
  const hasFilters = !!selectedType || !!searchQuery;

  // Virtualized list setup
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    setScrollMargin(listContainerRef.current?.offsetTop ?? 0);
  });

  const virtualizer = useWindowVirtualizer({
    count: filteredDrinks.length,
    estimateSize: () => 92,
    overscan: 5,
    scrollMargin,
  });

  const handleSave = async (drinkData: Omit<Drink, 'id' | 'dateAdded'>) => {
    if (editingDrink) {
      await updateDrink(editingDrink.id, drinkData);
      toast.success('Drink updated', { description: `${drinkData.name} has been updated.` });
    } else {
      const result = await addDrink(drinkData);
      if (result && 'isDuplicate' in result && result.isDuplicate) {
        toast.error('This drink already exists', {
          description: 'You can edit the existing drink or use a different name.',
          duration: 5000,
        });
        return;
      }
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

  const handleWishlistToggle = async (drinkId: string, isWishlist: boolean) => {
    await updateDrink(drinkId, { isWishlist });
    if (viewingDrink?.id === drinkId) {
      setViewingDrink(prev => prev ? { ...prev, isWishlist } : null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingDrink(null);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) console.warn('Sign out error (proceeding anyway):', error.message);
    toast.success('Signed out', { description: 'You have been signed out successfully.' });
    navigate('/auth');
  };

  if (authLoading || isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
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
        <main className="container mx-auto px-4 py-6">
          <div className="h-10 w-full rounded-lg shimmer mb-4" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-20 rounded-lg shimmer flex-shrink-0" />
              ))}
            </div>
            <div className="h-10 w-36 rounded-lg shimmer" />
          </div>
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <DrinkListItemSkeleton key={i} style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  if (showWelcomeCarousel) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <WelcomeCarousel onComplete={completeWelcome} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TestFlightBanner />

      <HomeHeader
        appVersion={appInfo?.version}
        avatarUrl={profile?.avatarUrl}
        displayName={profile?.displayName}
        email={user.email}
        username={profile?.username}
        onAddClick={handleAddClick}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-6">
        <OnboardingSection
          isStepVisible={isStepVisible}
          dismissStep={dismissStep}
          drinkCount={drinks.length}
          onAddClick={handleAddClick}
        />

        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          drinkCountByType={drinkCountByType}
          totalDrinks={totalDrinks}
          onMigrateDrinksToOther={migrateDrinksToOther}
        />

        {filteredDrinks.length > 0 && filteredDrinks.length !== totalDrinks && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>Showing {filteredDrinks.length} of {totalDrinks}</span>
            {hasFilters && (
              <button onClick={handleClearFilters} className="text-primary hover:underline text-xs">
                Clear
              </button>
            )}
          </div>
        )}

        {filteredDrinks.length > 0 ? (
          <div
            ref={listContainerRef}
            className="max-w-2xl mx-auto"
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const drink = filteredDrinks[virtualItem.index];
              return (
                <div
                  key={drink.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start - (virtualizer.options.scrollMargin ?? 0)}px)`,
                  }}
                  className="pb-3"
                >
                  <MemoizedDrinkListItem
                    drink={drink}
                    onClick={() => setViewingDrink(drink)}
                    onWishlistToggle={handleWishlistToggle}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            hasFilters={hasFilters}
            onAddClick={handleAddClick}
            onClearFilters={handleClearFilters}
          />
        )}
      </main>

      {isMobile && <div className="h-20" />}

      {!isMobile && (
        <AddDrinkDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSave={handleSave}
          editDrink={editingDrink}
          defaultType={selectedType || profile?.defaultDrinkType || 'whiskey'}
        />
      )}

      <DrinkDetailModal
        drink={viewingDrink}
        open={!!viewingDrink}
        onOpenChange={(open) => { if (!open) setViewingDrink(null); }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onWishlistToggle={handleWishlistToggle}
      />
    </div>
  );
};

export default Index;
