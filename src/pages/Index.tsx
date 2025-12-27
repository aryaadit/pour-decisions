import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrinks } from '@/hooks/useDrinks';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useThemeContext } from '@/hooks/ThemeProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppInfo } from '@/hooks/useAppInfo';
import { DrinkType, Drink } from '@/types/drink';
import { SortOrder } from '@/types/profile';
import { DrinkListItem } from '@/components/DrinkListItem';
import { DrinkDetailModal } from '@/components/DrinkDetailModal';
import { DrinkTypeFilter } from '@/components/DrinkTypeFilter';
import { SortSelector } from '@/components/SortSelector';
import { SearchBar } from '@/components/SearchBar';
import { AddDrinkDialog } from '@/components/AddDrinkDialog';
import { EmptyState } from '@/components/EmptyState';
import { ProfileMenu } from '@/components/ProfileMenu';
import { Button } from '@/components/ui/button';
import { Plus, GlassWater, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { setTheme } = useThemeContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const appInfo = useAppInfo();
  const { drinks, isLoading, addDrink, updateDrink, deleteDrink, filterDrinks } = useDrinks();
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
    const theme = selectedType || 'all';
    document.documentElement.setAttribute('data-drink-theme', theme);
    return () => {
      document.documentElement.removeAttribute('data-drink-theme');
    };
  }, [selectedType]);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <GlassWater className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  Pour Decisions
                  {appInfo && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground/50">v{appInfo.version}</span>
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
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40"
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
