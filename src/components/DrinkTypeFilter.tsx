import { useState } from 'react';
import { DrinkType, builtInDrinkTypes, drinkTypeLabels, drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useCustomDrinkTypes, CustomDrinkType } from '@/hooks/useCustomDrinkTypes';
import { CustomDrinkTypeDialog } from '@/components/AddCustomDrinkTypeDialog';
import { Plus, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface DrinkTypeFilterProps {
  selectedType: DrinkType | null;
  onSelectType: (type: DrinkType | null) => void;
}

export function DrinkTypeFilter({ selectedType, onSelectType }: DrinkTypeFilterProps) {
  const { selectionChanged } = useHaptics();
  const { customTypes, addCustomType, updateCustomType, deleteCustomType } = useCustomDrinkTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CustomDrinkType | null>(null);

  const handleSelect = (type: DrinkType | null) => {
    if (type !== selectedType) {
      selectionChanged();
    }
    onSelectType(type);
  };

  const handleSaveCustomType = async (name: string, icon: string, color: string) => {
    if (editingType) {
      // Update existing type
      const oldName = editingType.name;
      const result = await updateCustomType(editingType.id, { name, icon, color });
      if (result?.error) {
        return { error: result.error };
      }
      // If the edited type was selected and name changed, update selection
      if (selectedType === oldName && name !== oldName) {
        onSelectType(name);
      }
      toast.success('Drink type updated', { description: `${name} has been updated.` });
    } else {
      // Add new type
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

  const handleDeleteCustomType = async (id: string, name: string) => {
    const result = await deleteCustomType(id);
    if (result?.error) {
      toast.error('Failed to delete', { description: result.error });
      return;
    }
    // If the deleted type was selected, reset to "All"
    if (selectedType === name) {
      onSelectType(null);
    }
    toast.success('Drink type removed', { description: `${name} has been removed.` });
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

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* All filter */}
        <Button
          variant={selectedType === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSelect(null)}
          className={cn(
            'transition-all duration-200 min-h-[44px] min-w-[44px]',
            selectedType === null && 'shadow-glow'
          )}
        >
          <span>🍹</span>
          <span>All</span>
        </Button>

        {/* Built-in types */}
        {builtInDrinkTypes.map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelect(type)}
            className={cn(
              'transition-all duration-200 min-h-[44px] min-w-[44px]',
              selectedType === type && 'shadow-glow'
            )}
          >
            <span>{getTypeIcon(type)}</span>
            <span>{getTypeLabel(type)}</span>
          </Button>
        ))}

        {/* Custom types with context menu for edit/delete */}
        {customTypes.map((customType) => (
          <ContextMenu key={customType.id}>
            <ContextMenuTrigger asChild>
              <Button
                variant={selectedType === customType.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelect(customType.name)}
                className={cn(
                  'transition-all duration-200 min-h-[44px] min-w-[44px]',
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
                onClick={() => handleDeleteCustomType(customType.id, customType.name)}
              >
                <X className="w-4 h-4 mr-2" />
                Remove "{customType.name}"
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}

        {/* Add custom type button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddClick}
          className="transition-all duration-200 min-h-[44px] min-w-[44px] border-dashed"
        >
          <Plus className="w-4 h-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Add</span>
        </Button>
      </div>

      <CustomDrinkTypeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSaveCustomType}
        editingType={editingType}
      />
    </>
  );
}
