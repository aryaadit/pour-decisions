import { useState } from 'react';
import { ImpactStyle } from '@capacitor/haptics';
import { DrinkType, builtInDrinkTypes, drinkTypeLabels, drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';
import { SortOrder, sortOrderLabels } from '@/types/profile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useCustomDrinkTypes, CustomDrinkType } from '@/hooks/useCustomDrinkTypes';
import { CustomDrinkTypeDialog } from '@/components/AddCustomDrinkTypeDialog';
import { Plus, X, Pencil, AlertTriangle, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
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
import { useIsMobile } from '@/hooks/use-mobile';

interface FilterSheetProps {
  selectedType: DrinkType | null;
  onSelectType: (type: DrinkType | null) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  drinkCountByType?: Record<string, number>;
  onMigrateDrinksToOther?: (typeName: string) => Promise<void>;
  totalDrinks: number;
}

const sortOptions: SortOrder[] = ['date_desc', 'date_asc', 'rating_desc', 'rating_asc', 'name_asc', 'name_desc'];

export function FilterSheet({ 
  selectedType, 
  onSelectType, 
  sortOrder,
  onSortChange,
  drinkCountByType = {},
  onMigrateDrinksToOther,
  totalDrinks,
}: FilterSheetProps) {
  const isMobile = useIsMobile();
  const { selectionChanged, impact } = useHaptics();
  const { customTypes, addCustomType, updateCustomType, deleteCustomType } = useCustomDrinkTypes();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CustomDrinkType | null>(null);
  const [deleteWarningType, setDeleteWarningType] = useState<CustomDrinkType | null>(null);

  const activeFiltersCount = (selectedType ? 1 : 0) + (sortOrder !== 'date_desc' ? 1 : 0);

  const handleSelect = (type: DrinkType | null) => {
    if (type !== selectedType) {
      selectionChanged();
    }
    onSelectType(type);
  };

  const handleSortSelect = (order: SortOrder) => {
    if (order !== sortOrder) {
      selectionChanged();
    }
    onSortChange(order);
  };

  const handleReset = () => {
    impact(ImpactStyle.Light);
    onSelectType(null);
    onSortChange('date_desc');
    setOpen(false);
  };

  const handleSaveCustomType = async (name: string, icon: string, color: string) => {
    if (editingType) {
      const oldName = editingType.name;
      const result = await updateCustomType(editingType.id, { name, icon, color });
      if (result?.error) {
        return { error: result.error };
      }
      if (selectedType === oldName && name !== oldName) {
        onSelectType(name);
      }
      toast.success('Drink type updated', { description: `${name} has been updated.` });
    } else {
      const result = await addCustomType(name, icon, color);
      if (result?.error) {
        return { error: result.error };
      }
      toast.success('Drink type added', { description: `${name} is now available.` });
    }
    return null;
  };

  const handleEditCustomType = (customType: CustomDrinkType) => {
    setEditingType(customType);
    setDialogOpen(true);
  };

  const handleDeleteCustomType = async (customType: CustomDrinkType) => {
    const drinkCount = drinkCountByType[customType.name] || 0;
    if (drinkCount > 0) {
      setDeleteWarningType(customType);
    } else {
      await performDelete(customType);
    }
  };

  const performDelete = async (customType: CustomDrinkType) => {
    const drinkCount = drinkCountByType[customType.name] || 0;
    if (drinkCount > 0 && onMigrateDrinksToOther) {
      await onMigrateDrinksToOther(customType.name);
    }
    const result = await deleteCustomType(customType.id);
    if (result?.error) {
      toast.error('Failed to delete', { description: result.error });
      return;
    }
    if (selectedType === customType.name) {
      onSelectType(null);
    }
    toast.success('Drink type removed', { 
      description: drinkCount > 0 
        ? `${customType.name} removed. ${drinkCount} drink${drinkCount > 1 ? 's' : ''} moved to Other.`
        : `${customType.name} has been removed.` 
    });
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingType(null);
    }
  };

  const handleAddClick = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const getTypeIcon = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) {
      return drinkTypeIcons[type];
    }
    const custom = customTypes.find((c) => c.name === type);
    return custom?.icon || '🍹';
  };

  const getTypeLabel = (type: DrinkType) => {
    if (isBuiltInDrinkType(type)) {
      return drinkTypeLabels[type];
    }
    return type;
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Drink Types */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Drink Type</h3>
        <div className="flex flex-wrap gap-2">
          {/* All filter */}
          <Button
            variant={selectedType === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelect(null)}
            className={cn(
              'transition-all duration-200',
              selectedType === null && 'shadow-glow'
            )}
          >
            <span>🍹</span>
            <span>All</span>
            <span className="ml-1 text-xs opacity-70">({totalDrinks})</span>
          </Button>

          {/* Built-in types */}
          {builtInDrinkTypes.map((type) => {
            const count = drinkCountByType[type] || 0;
            return (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelect(type)}
                className={cn(
                  'transition-all duration-200',
                  selectedType === type && 'shadow-glow'
                )}
              >
                <span>{getTypeIcon(type)}</span>
                <span>{getTypeLabel(type)}</span>
                {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
              </Button>
            );
          })}

          {/* Custom types */}
          {customTypes.map((customType) => {
            const count = drinkCountByType[customType.name] || 0;
            return (
              <ContextMenu key={customType.id}>
                <ContextMenuTrigger asChild>
                  <Button
                    variant={selectedType === customType.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSelect(customType.name)}
                    className={cn(
                      'transition-all duration-200',
                      selectedType === customType.name && 'shadow-glow'
                    )}
                    style={selectedType !== customType.name ? {
                      borderColor: `${customType.color}40`,
                      color: customType.color,
                    } : {
                      backgroundColor: customType.color,
                      borderColor: customType.color,
                    }}
                  >
                    <span>{customType.icon}</span>
                    <span>{customType.name}</span>
                    {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
                  </Button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleEditCustomType(customType)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit "{customType.name}"
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteCustomType(customType)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove "{customType.name}"
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {/* Add custom type button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddClick}
            className="transition-all duration-200 border-dashed"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Sort By</h3>
        <div className="grid grid-cols-2 gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option}
              variant={sortOrder === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortSelect(option)}
              className={cn(
                'justify-start transition-all duration-200',
                sortOrder === option && 'shadow-glow'
              )}
            >
              {sortOrderLabels[option]}
            </Button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All Filters
        </Button>
      )}
    </div>
  );

  const triggerButton = (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'gap-2 min-h-[44px] transition-all duration-200',
        activeFiltersCount > 0 && 'border-primary/50 bg-primary/5'
      )}
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span>Filters</span>
      {activeFiltersCount > 0 && (
        <span className="flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary text-primary-foreground rounded-full animate-scale-in">
          {activeFiltersCount}
        </span>
      )}
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            {triggerButton}
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters & Sort</SheetTitle>
            </SheetHeader>
            {filterContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="end">
            {filterContent}
          </PopoverContent>
        </Popover>
      )}

      <CustomDrinkTypeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSaveCustomType}
        editingType={editingType}
      />

      {/* Delete warning dialog */}
      <AlertDialog open={!!deleteWarningType} onOpenChange={(open) => !open && setDeleteWarningType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Delete "{deleteWarningType?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This drink type has <strong>{drinkCountByType[deleteWarningType?.name || ''] || 0} drink{(drinkCountByType[deleteWarningType?.name || ''] || 0) > 1 ? 's' : ''}</strong> assigned to it. 
              Deleting this type will move {(drinkCountByType[deleteWarningType?.name || ''] || 0) > 1 ? 'them' : 'it'} to the "Other" category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteWarningType) {
                  performDelete(deleteWarningType);
                  setDeleteWarningType(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete & Move Drinks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
