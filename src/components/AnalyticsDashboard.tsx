import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, MousePointerClick, Eye, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  pageViews: number;
  actions: number;
  errors: number;
}

interface TopEvent {
  event_name: string;
  count: number;
}

interface DailyStats {
  date: string;
  events: number;
  users: number;
}

export function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [dateRange] = useState(7); // Last 7 days

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const startDate = subDays(new Date(), dateRange).toISOString();

    try {
      // Fetch all events for the period
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (events) {
        // Calculate summary
        const uniqueUserIds = new Set(events.filter(e => e.user_id).map(e => e.user_id));
        const uniqueSessionIds = new Set(events.map(e => e.session_id));
        
        setSummary({
          totalEvents: events.length,
          uniqueUsers: uniqueUserIds.size,
          uniqueSessions: uniqueSessionIds.size,
          pageViews: events.filter(e => e.event_category === 'page_view').length,
          actions: events.filter(e => e.event_category === 'action').length,
          errors: events.filter(e => e.event_category === 'error').length,
        });

        // Calculate top events
        const eventCounts: Record<string, number> = {};
        events.forEach(e => {
          if (e.event_category === 'action' || e.event_category === 'page_view') {
            eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
          }
        });
        const sortedEvents = Object.entries(eventCounts)
          .map(([event_name, count]) => ({ event_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopEvents(sortedEvents);

        // Calculate daily stats
        const dailyMap: Record<string, { events: number; users: Set<string> }> = {};
        events.forEach(e => {
          const date = format(new Date(e.created_at), 'yyyy-MM-dd');
          if (!dailyMap[date]) {
            dailyMap[date] = { events: 0, users: new Set() };
          }
          dailyMap[date].events++;
          if (e.user_id) dailyMap[date].users.add(e.user_id);
        });
        
        const daily = Object.entries(dailyMap)
          .map(([date, stats]) => ({
            date,
            events: stats.events,
            users: stats.users.size,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setDailyStats(daily);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics (Last {dateRange} days)</h2>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Unique Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">{summary?.uniqueSessions || 0} sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.pageViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.actions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary?.errors || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Events</CardTitle>
        </CardHeader>
        <CardContent>
          {topEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events recorded yet</p>
          ) : (
            <div className="space-y-2">
              {topEvents.map((event, index) => (
                <div key={event.event_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                    <span className="text-sm font-medium">{event.event_name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{event.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data available</p>
          ) : (
            <div className="space-y-2">
              {dailyStats.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(day.date), 'MMM d')}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{day.events} events</span>
                    <span className="text-sm text-muted-foreground">{day.users} users</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
