import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bug, Loader2, Trash2, RefreshCw, Image as ImageIcon, BarChart3, Wrench, RotateCcw, Users, Search, Check, X, ExternalLink, FileText, ImageIcon as ImageLucide } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  has_seen_welcome: boolean;
  onboarding_step: string;
  dismissed_onboarding_steps: string[];
}

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-600 border-green-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
  // Dev Tools state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const fetchBugReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBugReports(data || []);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      toast.error('Failed to load bug reports');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, has_seen_welcome, onboarding_step, dismissed_onboarding_steps')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults((data as UserProfile[]) || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const updateUserOnboarding = async (userId: string, updates: Partial<Pick<UserProfile, 'has_seen_welcome' | 'onboarding_step' | 'dismissed_onboarding_steps'>>) => {
    setIsUpdatingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      if (selectedUser && selectedUser.user_id === userId) {
        setSelectedUser({ ...selectedUser, ...updates });
      }
      toast.success('User onboarding updated');
    } catch (error) {
      console.error('Error updating user onboarding:', error);
      toast.error('Failed to update user onboarding');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const resetUserOnboarding = async (userId: string) => {
    await updateUserOnboarding(userId, {
      has_seen_welcome: false,
      onboarding_step: 'welcome',
      dismissed_onboarding_steps: [],
    });
  };

  const markUserOnboardingComplete = async (userId: string) => {
    await updateUserOnboarding(userId, {
      has_seen_welcome: true,
      onboarding_step: 'completed',
      dismissed_onboarding_steps: ['welcome', 'add_drink', 'collections', 'social'],
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!adminLoading && !isAdmin) {
      toast.error('Access denied', { description: 'You do not have admin privileges.' });
      navigate('/');
      return;
    }

    if (isAdmin) {
      fetchBugReports();
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      setBugReports(prev =>
        prev.map(report =>
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      );
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this bug report?')) return;

    try {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setBugReports(prev => prev.filter(report => report.id !== reportId));
      toast.success('Bug report deleted');
    } catch (error) {
      console.error('Error deleting bug report:', error);
      toast.error('Failed to delete bug report');
    }
  };

  const filteredReports = selectedStatus === 'all'
    ? bugReports
    : bugReports.filter(report => report.status === selectedStatus);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Analytics & Bug Reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="bugs" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Bug Reports
            </TabsTrigger>
            <TabsTrigger value="devtools" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Dev Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="devtools">
            <div className="max-w-xl mx-auto space-y-4">
              {/* Self Reset Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    My Onboarding
                  </CardTitle>
                  <CardDescription>
                    Reset your own onboarding flags to test the welcome carousel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!user) return;
                      await resetUserOnboarding(user.id);
                    }}
                    disabled={isUpdatingUser}
                  >
                    {isUpdatingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Reset My Onboarding
                  </Button>
                </CardContent>
              </Card>

              {/* User Impersonation Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Onboarding Manager
                  </CardTitle>
                  <CardDescription>
                    Search for any user and toggle their onboarding state for testing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username or display name..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && !selectedUser && (
                    <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                      {searchResults.map((profile) => (
                        <button
                          key={profile.id}
                          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => {
                            setSelectedUser(profile);
                            setUserSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(profile.display_name || profile.username || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {profile.display_name || profile.username || 'Unknown'}
                            </p>
                            {profile.username && (
                              <p className="text-xs text-muted-foreground">@{profile.username}</p>
                            )}
                          </div>
                          <Badge variant="outline" className={profile.has_seen_welcome ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}>
                            {profile.has_seen_welcome ? 'Completed' : 'New User'}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected User Panel */}
                  {selectedUser && (
                    <div className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={selectedUser.avatar_url || undefined} />
                            <AvatarFallback>
                              {(selectedUser.display_name || selectedUser.username || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {selectedUser.display_name || selectedUser.username || 'Unknown'}
                            </p>
                            {selectedUser.username && (
                              <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="has-seen-welcome" className="text-sm">Has Seen Welcome</Label>
                          <Switch
                            id="has-seen-welcome"
                            checked={selectedUser.has_seen_welcome}
                            disabled={isUpdatingUser}
                            onCheckedChange={(checked) => {
                              updateUserOnboarding(selectedUser.user_id, { has_seen_welcome: checked });
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Onboarding Step</Label>
                          <Badge variant="outline">{selectedUser.onboarding_step}</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Dismissed Steps</Label>
                          <span className="text-xs text-muted-foreground">
                            {selectedUser.dismissed_onboarding_steps?.length || 0} steps
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isUpdatingUser}
                          onClick={() => resetUserOnboarding(selectedUser.user_id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isUpdatingUser}
                          onClick={() => markUserOnboardingComplete(selectedUser.user_id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  )}

                  {userSearchQuery && searchResults.length === 0 && !isSearching && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found matching "{userSearchQuery}"
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Store Assets Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageLucide className="w-5 h-5" />
                    Store Assets & Pages
                  </CardTitle>
                  <CardDescription>
                    Quick access to app store assets and compliance pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate('/store-listing')}
                  >
                    <FileText className="w-4 h-4" />
                    Store Listing Page
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => navigate('/privacy')}
                  >
                    <FileText className="w-4 h-4" />
                    Privacy Policy
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    asChild
                  >
                    <a href="/feature-graphic.png" target="_blank" rel="noopener noreferrer">
                      <ImageLucide className="w-4 h-4" />
                      Feature Graphic (1024x500)
                      <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bugs">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchBugReports} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredReports.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Bug className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No bug reports found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {filteredReports.map(report => (
                  <Card key={report.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{report.title}</CardTitle>
                          <CardDescription className="mt-1">
                            Submitted {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={statusColors[report.status] || statusColors.open}>
                          {report.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {report.description}
                      </p>
                      {report.image_url && (
                        <div className="relative">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <ImageIcon className="w-3 h-3" />
                            Attached Screenshot
                          </div>
                          <img
                            src={report.image_url}
                            alt="Bug report screenshot"
                            className="rounded-lg border border-border max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setEnlargedImage(report.image_url)}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/50">
                        <Select
                          value={report.status}
                          onValueChange={(value) => handleStatusChange(report.id, value)}
                        >
                          <SelectTrigger className="w-36 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-4xl p-2">
            {enlargedImage && (
              <img
                src={enlargedImage}
                alt="Bug report screenshot"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
