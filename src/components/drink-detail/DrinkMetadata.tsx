import { Drink } from '@/types/drink';
import { MapPin, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DrinkMetadataProps {
  drink: Drink;
}

export function DrinkMetadata({ drink }: DrinkMetadataProps) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      {drink.location && (
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {drink.location}
        </span>
      )}
      {drink.price && (
        <span className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" />
          {String(drink.price).replace(/^\$/, '')}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Calendar className="h-4 w-4" />
        {format(drink.dateAdded, 'MMMM d, yyyy')}
      </span>
    </div>
  );
}
