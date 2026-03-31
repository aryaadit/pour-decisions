import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useFollowRequests } from '@/hooks/useFollowRequests';
import { useIsMobile } from '@/hooks/use-mobile';
import { queryKeys } from '@/lib/queryKeys';

import { PageHeader } from '@/components/PageHeader';
import { PullToRefresh } from '@/components/PullToRefresh';
import { NotificationItem } from '@/components/NotificationItem';
import { FollowRequestCard } from '@/components/FollowRequestCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch,
  } = useNotifications();
  const { pendingRequests } = useFollowRequests();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleRefresh = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: queryKeys.followRequests.all }),
    ]);
  };

  const isEmpty = notifications.length === 0 && pendingRequests.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Notifications"
        icon={<Bell className="h-5 w-5" />}
        showBack={true}
        rightContent={
          notifications.length > 0 ? (
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-xs text-muted-foreground"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => clearAllNotifications()}
                className="text-muted-foreground min-w-[44px] min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : undefined
        }
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <main className="max-w-2xl mx-auto">
          {/* Follow Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="border-b border-border/50">
              <div className="px-4 py-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Follow Requests ({pendingRequests.length})
                </h2>
              </div>
              {pendingRequests.map((request) => (
                <FollowRequestCard key={request.id} request={request} />
              ))}
            </div>
          )}

          {/* Notifications List */}
          {isLoading && notifications.length === 0 ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <BellOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No notifications yet
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                When people interact with you, you'll see it here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}

              {hasMore && (
                <div className="text-center py-4">
                  <Button variant="outline" onClick={loadMore}>
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </PullToRefresh>

      {isMobile && <div className="h-20" />}
    </div>
  );
}
