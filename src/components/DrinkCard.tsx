import { Drink } from '@/types/drink';
import { StarRating } from './StarRating';
import { DrinkTypeBadge } from './DrinkTypeBadge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, DollarSign, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface DrinkCardProps {
  drink: Drink;
  onEdit: (drink: Drink) => void;
  onDelete: (id: string) => void;
  style?: React.CSSProperties;
}

export function DrinkCard({ drink, onEdit, onDelete, style }: DrinkCardProps) {
  return (
    <Card 
      className="group bg-gradient-card border-border/50 shadow-card hover:border-primary/30 transition-all duration-300 hover:shadow-glow animate-fade-in overflow-hidden"
      style={style}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-semibold text-foreground truncate">
              {drink.name}
            </h3>
            {drink.brand && (
              <p className="text-sm text-muted-foreground truncate">{drink.brand}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(drink)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(drink.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <DrinkTypeBadge type={drink.type} />
          <StarRating rating={drink.rating} readonly size="sm" />
        </div>

        {drink.notes && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {drink.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {drink.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {drink.location}
            </span>
          )}
          {drink.price && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {drink.price}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="h-3 w-3" />
            {format(drink.dateAdded, 'MMM d, yyyy')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
