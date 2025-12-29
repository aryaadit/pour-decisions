import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function FavoriteButton({ 
  isFavorite, 
  onToggle, 
  size = 'sm',
  className 
}: FavoriteButtonProps) {
  const { impact, ImpactStyle } = useHaptics();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    impact(isFavorite ? ImpactStyle.Medium : ImpactStyle.Light);
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        size === 'sm' && "w-8 h-8",
        size === 'md' && "w-10 h-10",
        isFavorite 
          ? "text-red-500" 
          : "text-muted-foreground hover:text-red-400",
        className
      )}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={cn(
          "transition-all duration-200",
          size === 'sm' && "w-5 h-5",
          size === 'md' && "w-6 h-6",
          isFavorite && "fill-current animate-scale-in"
        )}
      />
    </button>
  );
}
