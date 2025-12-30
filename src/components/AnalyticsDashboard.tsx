import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  RefreshCw, Users, MousePointerClick, Eye, AlertTriangle, 
  ChevronDown, ChevronRight, Clock, Monitor, Smartphone, 
  Globe, Search, User, Activity, Filter, X
} from 'lucide-react';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string;
  event_name: string;
  event_category: string;
  properties: Json;
  device_info: Json;
  created_at: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  pageViews: number;
  actions: number;
  errors: number;
}

interface UserSummary {
  user_id: string;
  eventCount: number;
  sessionCount: number;
  lastSeen: string;
  topEvents: string[];
}

const categoryColors: Record<string, string> = {
  page_view: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  action: 'bg-green-500/20 text-green-600 border-green-500/30',
  error: 'bg-red-500/20 text-red-600 border-red-500/30',
  engagement: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
};

function JsonViewer({ data, label }: { data: Json; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-x-auto max-w-full">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EventRow({ event, onUserClick }: { event: AnalyticsEvent; onUserClick: (userId: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const deviceInfo = event.device_info as Record<string, Json> | null;
  const properties = event.properties as Record<string, Json> | null;
  
  const isMobile = deviceInfo?.userAgent?.toString().toLowerCase().includes('mobile');
  const platform = deviceInfo?.platform?.toString() || 'Unknown';
  const browser = (() => {
    const ua = deviceInfo?.userAgent?.toString() || '';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  })();

  return (
    <div className="border-b border-border/50 last:border-0">
      <div 
        className="p-3 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={categoryColors[event.event_category] || 'bg-muted'}>
                {event.event_category}
              </Badge>
              <span className="font-medium text-sm">{event.event_name}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(event.created_at), 'MMM d, h:mm:ss a')}
              </span>
              {event.user_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserClick(event.user_id!);
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <User className="w-3 h-3" />
                  {event.user_id.slice(0, 8)}...
                </button>
              )}
              <span className="flex items-center gap-1">
                {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                {platform}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {browser}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p><span className="text-muted-foreground">Event ID:</span> {event.id}</p>
              <p><span className="text-muted-foreground">Session ID:</span> {event.session_id}</p>
              <p><span className="text-muted-foreground">User ID:</span> {event.user_id || 'Anonymous'}</p>
              <p><span className="text-muted-foreground">Timestamp:</span> {new Date(event.created_at).toISOString()}</p>
            </div>
            <div className="space-y-1">
              <p><span className="text-muted-foreground">Screen:</span> {String(deviceInfo?.screenWidth || 'Unknown')}x{String(deviceInfo?.screenHeight || 'Unknown')}</p>
              <p><span className="text-muted-foreground">Language:</span> {String(deviceInfo?.language || 'Unknown')}</p>
              <p><span className="text-muted-foreground">Timezone:</span> {String(deviceInfo?.timezone || 'Unknown')}</p>
            </div>
          </div>
          
          <div className="space-y-2 pt-2 border-t border-border/50">
            <JsonViewer data={properties || {}} label="Properties" />
            <JsonViewer data={deviceInfo || {}} label="Device Info" />
          </div>
        </div>
      )}
    </div>
  );
}

function UserDetailView({ 
  userId, 
  events, 
  onBack 
}: { 
  userId: string; 
  events: AnalyticsEvent[];
  onBack: () => void;
}) {
  const userEvents = useMemo(() => 
    events.filter(e => e.user_id === userId).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ), 
    [events, userId]
  );

  const sessions = useMemo(() => {
    const sessionMap = new Map<string, AnalyticsEvent[]>();
    userEvents.forEach(e => {
      if (!sessionMap.has(e.session_id)) {
        sessionMap.set(e.session_id, []);
      }
      sessionMap.get(e.session_id)!.push(e);
    });
    return Array.from(sessionMap.entries()).map(([sessionId, events]) => ({
      sessionId,
      events: events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      startTime: events.reduce((min, e) => 
        new Date(e.created_at) < new Date(min) ? e.created_at : min, 
        events[0].created_at
      ),
    })).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [userEvents]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userEvents.forEach(e => {
      counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [userEvents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h3 className="font-semibold">User: {userId.slice(0, 8)}...</h3>
          <p className="text-xs text-muted-foreground">
            {userEvents.length} events across {sessions.length} sessions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Last Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {userEvents.length > 0 
                ? formatDistanceToNow(new Date(userEvents[0].created_at), { addSuffix: true })
                : 'Never'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {eventCounts.slice(0, 10).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm">{name}</span>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {sessions.map((session) => (
              <Collapsible key={session.sessionId}>
                <CollapsibleTrigger className="w-full p-3 hover:bg-muted/30 transition-colors border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Session {session.sessionId.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{session.events.length} events</span>
                      <span>•</span>
                      <span>{format(new Date(session.startTime), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-6 border-l-2 border-primary/20 ml-5">
                    {session.events.map((event, idx) => (
                      <div key={event.id} className="py-2 pl-4 relative">
                        <div className="absolute -left-[9px] top-3 w-4 h-4 rounded-full bg-background border-2 border-primary/50" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${categoryColors[event.event_category]} text-xs`}>
                            {event.event_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), 'h:mm:ss a')}
                          </span>
                        </div>
                        {event.properties && Object.keys(event.properties as object).length > 0 && (
                          <pre className="mt-1 text-xs text-muted-foreground bg-muted/30 p-1 rounded max-w-full overflow-x-auto">
                            {JSON.stringify(event.properties, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dateRange, setDateRange] = useState(7);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [eventNameFilter, setEventNameFilter] = useState<string>('all');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const startDate = subDays(new Date(), dateRange).toISOString();

    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (data) {
        setEvents(data as AnalyticsEvent[]);
        
        const uniqueUserIds = new Set(data.filter(e => e.user_id).map(e => e.user_id));
        const uniqueSessionIds = new Set(data.map(e => e.session_id));
        
        setSummary({
          totalEvents: data.length,
          uniqueUsers: uniqueUserIds.size,
          uniqueSessions: uniqueSessionIds.size,
          pageViews: data.filter(e => e.event_category === 'page_view').length,
          actions: data.filter(e => e.event_category === 'action').length,
          errors: data.filter(e => e.event_category === 'error').length,
        });
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

  const uniqueEventNames = useMemo(() => {
    const names = new Set(events.map(e => e.event_name));
    return Array.from(names).sort();
  }, [events]);

  const userSummaries = useMemo((): UserSummary[] => {
    const userMap = new Map<string, { events: AnalyticsEvent[]; sessions: Set<string> }>();
    
    events.forEach(e => {
      if (!e.user_id) return;
      if (!userMap.has(e.user_id)) {
        userMap.set(e.user_id, { events: [], sessions: new Set() });
      }
      userMap.get(e.user_id)!.events.push(e);
      userMap.get(e.user_id)!.sessions.add(e.session_id);
    });

    return Array.from(userMap.entries()).map(([user_id, data]) => {
      const eventCounts: Record<string, number> = {};
      data.events.forEach(e => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });
      const topEvents = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      return {
        user_id,
        eventCount: data.events.length,
        sessionCount: data.sessions.size,
        lastSeen: data.events.reduce((latest, e) => 
          new Date(e.created_at) > new Date(latest) ? e.created_at : latest,
          data.events[0].created_at
        ),
        topEvents,
      };
    }).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (categoryFilter !== 'all' && e.event_category !== categoryFilter) return false;
      if (eventNameFilter !== 'all' && e.event_name !== eventNameFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = e.id.toLowerCase().includes(query);
        const matchesUser = e.user_id?.toLowerCase().includes(query);
        const matchesSession = e.session_id.toLowerCase().includes(query);
        const matchesName = e.event_name.toLowerCase().includes(query);
        const matchesProps = JSON.stringify(e.properties).toLowerCase().includes(query);
        if (!matchesId && !matchesUser && !matchesSession && !matchesName && !matchesProps) {
          return false;
        }
      }
      return true;
    });
  }, [events, categoryFilter, eventNameFilter, searchQuery]);

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

  if (selectedUser) {
    return (
      <UserDetailView 
        userId={selectedUser} 
        events={events} 
        onBack={() => setSelectedUser(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <div className="flex items-center gap-2">
          <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
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

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Event Log</TabsTrigger>
          <TabsTrigger value="users">Users ({userSummaries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events, users, properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="page_view">Page Views</SelectItem>
                <SelectItem value="action">Actions</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventNameFilter} onValueChange={setEventNameFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Event Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {uniqueEventNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchQuery || categoryFilter !== 'all' || eventNameFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setEventNameFilter('all');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Event Log ({filteredEvents.length} events)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No events found
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <EventRow 
                      key={event.id} 
                      event={event} 
                      onUserClick={setSelectedUser}
                    />
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {userSummaries.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No user data available
                  </div>
                ) : (
                  userSummaries.map(user => (
                    <div 
                      key={user.user_id}
                      className="p-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedUser(user.user_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.user_id.slice(0, 12)}...</p>
                            <p className="text-xs text-muted-foreground">
                              {user.eventCount} events • {user.sessionCount} sessions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Last seen {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                          </p>
                          <div className="flex gap-1 mt-1 justify-end">
                            {user.topEvents.map(name => (
                              <Badge key={name} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
