import { useState, useEffect, forwardRef, useCallback } from 'react';
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
  ({ value, onChange, placeholder = 'Search drinks...', debounceMs = 200 }, ref) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync external value changes
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
    }, [localValue, value, onChange, debounceMs]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    }, []);

    const handleClear = useCallback(() => {
      setLocalValue('');
      onChange('');
    }, [onChange]);

    return (
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={ref}
          value={localValue}
          onChange={handleChange}
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
