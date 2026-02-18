import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface BottomSheetSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
}

export function BottomSheetSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  triggerClassName,
}: BottomSheetSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption
    ? (
      <span className="flex items-center gap-2">
        {selectedOption.icon && <span>{selectedOption.icon}</span>}
        <span>{selectedOption.label}</span>
      </span>
    )
    : <span className="text-muted-foreground">{placeholder}</span>;

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          triggerClassName
        )}
      >
        {displayLabel}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center">{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 pb-6">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3 min-h-[44px] text-left transition-colors',
                  option.value === value
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50'
                )}
              >
                {option.icon && <span className="text-lg">{option.icon}</span>}
                <span className="flex-1 text-sm font-medium">{option.label}</span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
