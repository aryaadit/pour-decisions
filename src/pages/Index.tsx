import { useState } from 'react';
import { useDrinks } from '@/hooks/useDrinks';
import { DrinkType, Drink } from '@/types/drink';
import { DrinkCard } from '@/components/DrinkCard';
import { DrinkTypeFilter } from '@/components/DrinkTypeFilter';
import { SearchBar } from '@/components/SearchBar';
import { AddDrinkDialog } from '@/components/AddDrinkDialog';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, GlassWater } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { drinks, isLoading, addDrink, updateDrink, deleteDrink, filterDrinks } = useDrinks();
  const [selectedType, setSelectedType] = useState<DrinkType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const { toast } = useToast();

  const filteredDrinks = filterDrinks(selectedType ?? undefined, searchQuery);
  const hasFilters = !!selectedType || !!searchQuery;

  const handleSave = (drinkData: Omit<Drink, 'id' | 'dateAdded'>) => {
    if (editingDrink) {
      updateDrink(editingDrink.id, drinkData);
      toast({
        title: 'Drink updated',
        description: `${drinkData.name} has been updated.`,
      });
    } else {
      addDrink(drinkData);
      toast({
        title: 'Drink added',
        description: `${drinkData.name} has been added to your collection.`,
      });
    }
    setEditingDrink(null);
  };

  const handleEdit = (drink: Drink) => {
    setEditingDrink(drink);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const drink = drinks.find(d => d.id === id);
    deleteDrink(id);
    toast({
      title: 'Drink removed',
      description: `${drink?.name} has been removed from your collection.`,
    });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <GlassWater className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  Pour Decisions
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Track your favorite drinks
                </p>
              </div>
            </div>

            <Button variant="glow" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Drink</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, brand, or notes..."
          />
          <DrinkTypeFilter
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />
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

        {/* Drink Grid */}
        {filteredDrinks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrinks.map((drink, index) => (
              <DrinkCard
                key={drink.id}
                drink={drink}
                onEdit={handleEdit}
                onDelete={handleDelete}
                style={{ animationDelay: `${index * 50}ms` }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            hasFilters={hasFilters}
            onAddClick={() => setDialogOpen(true)}
            onClearFilters={handleClearFilters}
          />
        )}
      </main>

      {/* Add/Edit Dialog */}
      <AddDrinkDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        editDrink={editingDrink}
      />
    </div>
  );
};

export default Index;
