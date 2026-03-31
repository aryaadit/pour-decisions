import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { StorageAvatar } from '@/components/StorageAvatar';
import { AppNotification } from '@/types/social';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationMessage(notification: AppNotification): React.ReactNode {
  const actorName = notification.actor?.displayName || notification.actor?.username || 'Someone';

  switch (notification.type) {
    case 'new_follower':
      return (
        <>
          <span className="font-semibold">{actorName}</span> started following you
        </>
      );
    case 'follow_request':
      return (
        <>
          <span className="font-semibold">{actorName}</span> requested to follow you
        </>
      );
    case 'follow_accepted':
      return (
        <>
          <span className="font-semibold">{actorName}</span> accepted your follow request
        </>
      );
    case 'drink_logged': {
      const drinkName = notification.metadata?.drink_name || 'a drink';
      return (
        <>
          <span className="font-semibold">{actorName}</span> logged{' '}
          <span className="font-semibold">{drinkName}</span>
        </>
      );
    }
    default:
      return null;
  }
}

const SWIPE_THRESHOLD = 80;

export function NotificationItem({ notification, onRead, onDelete }: NotificationItemProps) {
  const navigate = useNavigate();
  const actor = notification.actor;
  const initial = (actor?.displayName || actor?.username || '?').charAt(0).toUpperCase();

  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isVerticalRef = useRef(false);

  const handleClick = () => {
    if (isDraggingRef.current) return;
    if (!notification.isRead) {
      onRead(notification.id);
    }
    if (actor?.username) {
      navigate(`/u/${actor.username}`);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
    isVerticalRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Determine scroll direction on first significant movement
    if (!isDraggingRef.current && !isVerticalRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        isVerticalRef.current = true;
        return;
      }
      if (Math.abs(dx) > 5) {
        isDraggingRef.current = true;
      }
    }

    if (isVerticalRef.current) return;

    // Only allow left swipe (negative dx)
    if (dx < 0) {
      setOffsetX(Math.max(dx, -120));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -SWIPE_THRESHOLD) {
      // Commit the delete
      setIsDeleting(true);
      setOffsetX(-400);
      setTimeout(() => onDelete(notification.id), 200);
    } else {
      setOffsetX(0);
    }
    // Small delay before re-enabling click
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  if (isDeleting) {
    return (
      <div className="h-0 overflow-hidden transition-all duration-200" />
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive px-6">
        <Trash2 className="w-5 h-5 text-destructive-foreground" />
      </div>

      {/* Swipeable content */}
      <div
        className={cn(
          'relative flex items-start gap-3 px-4 py-3 cursor-pointer bg-background transition-colors',
          !notification.isRead && 'bg-primary/5',
          offsetX === 0 && 'transition-transform duration-200'
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <StorageAvatar
          storagePath={actor?.avatarUrl}
          fallback={initial}
          className="h-10 w-10 flex-shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            {getNotificationMessage(notification)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        {!notification.isRead && (
          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}
