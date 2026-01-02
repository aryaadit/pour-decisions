import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface WishlistToggleProps {
  isWishlist: boolean;
  onToggle: (newValue: boolean) => void;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export function WishlistToggle({ 
  isWishlist, 
  onToggle, 
  size = 'md',
  className,
  disabled = false 
}: WishlistToggleProps) {
  const { impact, ImpactStyle } = useHaptics();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (disabled) return;
    
    impact(ImpactStyle.Light);
    setIsAnimating(true);
    onToggle(!isWishlist);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative transition-all duration-200',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        isWishlist && 'text-amber-500 hover:text-amber-600',
        !isWishlist && 'text-muted-foreground hover:text-foreground',
        isAnimating && 'scale-110',
        className
      )}
      title={isWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {isWishlist ? (
        <BookmarkCheck className={cn(iconSize, 'fill-current')} />
      ) : (
        <Bookmark className={iconSize} />
      )}
    </Button>
  );
}
