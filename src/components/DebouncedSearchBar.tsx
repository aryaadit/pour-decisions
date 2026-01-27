import { useState, useEffect, forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DebouncedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const DebouncedSearchBar = forwardRef<HTMLInputElement, DebouncedSearchBarProps>(
  ({ value, onChange, placeholder = 'Search drinks...', debounceMs = 150 }, ref) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync local value when external value changes (e.g., clear filters)
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Debounce the onChange callback
    useEffect(() => {
      const timer = setTimeout(() => {
        if (localValue !== value) {
          onChange(localValue);
        }
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [localValue, debounceMs, onChange, value]);

    const handleClear = () => {
      setLocalValue('');
      onChange('');
    };

    return (
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-secondary/50 border-border focus:border-primary/50"
        />
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);

DebouncedSearchBar.displayName = 'DebouncedSearchBar';
