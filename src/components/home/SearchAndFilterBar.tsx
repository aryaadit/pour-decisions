import { DebouncedSearchBar } from '@/components/DebouncedSearchBar';
import { FilterSheet } from '@/components/FilterSheet';
import { QuickFilters } from '@/components/QuickFilters';
import { DrinkType } from '@/types/drink';
import { SortOrder } from '@/types/profile';

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: DrinkType | null;
  onSelectType: (type: DrinkType | null) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  drinkCountByType: Record<string, number>;
  totalDrinks: number;
  onMigrateDrinksToOther: (typeName: string) => Promise<void>;
}

export function SearchAndFilterBar({
  searchQuery,
  onSearchChange,
  selectedType,
  onSelectType,
  sortOrder,
  onSortChange,
  drinkCountByType,
  totalDrinks,
  onMigrateDrinksToOther,
}: SearchAndFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center gap-3">
        <DebouncedSearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search by name, brand, or notes..."
          debounceMs={150}
        />
        <FilterSheet
          selectedType={selectedType}
          onSelectType={onSelectType}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
          drinkCountByType={drinkCountByType}
          onMigrateDrinksToOther={onMigrateDrinksToOther}
          totalDrinks={totalDrinks}
        />
      </div>

      <QuickFilters
        selectedType={selectedType}
        onSelectType={onSelectType}
        drinkCountByType={drinkCountByType}
        totalDrinks={totalDrinks}
      />
    </div>
  );
}
