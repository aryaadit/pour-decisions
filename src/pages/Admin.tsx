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
import { ArrowLeft, Bug, Loader2, Trash2, RefreshCw, Image as ImageIcon, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';

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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="bugs" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Bug Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
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
