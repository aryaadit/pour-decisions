import { useNavigate } from 'react-router-dom';
import { StorageAvatar } from '@/components/StorageAvatar';
import { AppNotification } from '@/types/social';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
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

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const navigate = useNavigate();
  const actor = notification.actor;
  const initial = (actor?.displayName || actor?.username || '?').charAt(0).toUpperCase();

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    if (actor?.username) {
      navigate(`/u/${actor.username}`);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.isRead && 'bg-primary/5'
      )}
      onClick={handleClick}
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
  );
}
