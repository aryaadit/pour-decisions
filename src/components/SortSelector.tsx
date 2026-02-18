import { SortOrder, sortOrderLabels } from '@/types/profile';
import { BottomSheetSelect } from '@/components/ui/BottomSheetSelect';

interface SortSelectorProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

const sortOptions: SortOrder[] = ['date_desc', 'date_asc', 'rating_desc', 'rating_asc', 'name_asc', 'name_desc'];

export function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <BottomSheetSelect
      value={value}
      onValueChange={(v) => onChange(v as SortOrder)}
      placeholder="Sort by"
      triggerClassName="w-[160px] bg-background"
      options={sortOptions.map((option) => ({
        value: option,
        label: sortOrderLabels[option],
      }))}
    />
  );
}
