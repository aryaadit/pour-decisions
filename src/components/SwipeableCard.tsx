import { useState, useRef, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = 100;
const DELETE_THRESHOLD = 150;

export function SwipeableCard({ children, onDelete }: SwipeableCardProps) {
  const isMobile = useIsMobile();
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    
    // Only allow left swipe (positive diff)
    if (diff > 0) {
      // Add resistance after threshold
      const resistance = diff > SWIPE_THRESHOLD ? 0.3 : 1;
      const newTranslate = Math.min(diff * resistance, DELETE_THRESHOLD + 50);
      setTranslateX(-newTranslate);
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    
    const swipeDistance = Math.abs(translateX);
    
    if (swipeDistance >= DELETE_THRESHOLD) {
      // Animate out and delete
      setIsDeleting(true);
      setTranslateX(-window.innerWidth);
      setTimeout(() => {
        onDelete();
      }, 200);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  const deleteProgress = Math.min(Math.abs(translateX) / DELETE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background */}
      <div 
        className="absolute inset-0 bg-destructive flex items-center justify-end pr-6 rounded-xl"
        style={{ opacity: deleteProgress }}
      >
        <div 
          className="flex items-center gap-2 text-destructive-foreground"
          style={{ 
            transform: `scale(${0.8 + deleteProgress * 0.2})`,
            opacity: deleteProgress 
          }}
        >
          <Trash2 className="w-6 h-6" />
          <span className="font-medium">Delete</span>
        </div>
      </div>
      
      {/* Card content */}
      <div
        className="relative bg-background rounded-xl"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
          opacity: isDeleting ? 0 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
