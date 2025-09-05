import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Award, 
  Share,
  BarChart3,
  TrendingUp,
  Download,
  Eye,
  Mail,
  User,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ParticipantData {
  id: string;
  participant_id?: string;
  participant_name?: string;
  participant_email?: string;
  is_anonymous: boolean;
  started_at: string;
  submitted_at?: string;
  time_remaining_seconds?: number;
  total_score?: number;
  max_possible_score?: number;
  status: string;
  share_token?: string;
  completionTime?: number;
}

interface ShareData {
  id: string;
  share_token: string;
  access_count: number;
  completion_count: number;
  expires_at?: string;
  created_at: string;
  require_name: boolean;
  require_email: boolean;
  is_active: boolean;
}

interface EnhancedAnalyticsDashboardProps {
  assessmentId: string;
}

const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({ assessmentId }) => {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [shares, setShares] = useState<ShareData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'authenticated' | 'anonymous'>('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, [assessmentId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch all assessment instances (both authenticated and anonymous)
      const { data: instances, error: instancesError } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          participant_id,
          participant_name,
          participant_email,
          is_anonymous,
          started_at,
          submitted_at,
          time_remaining_seconds,
          total_score,
          max_possible_score,
          status,
          share_token
        `)
        .eq('assessment_id', assessmentId)
        .order('started_at', { ascending: false });

      if (instancesError) throw instancesError;

      // Process participants data
      const processedParticipants = instances?.map((instance: any) => ({
        ...instance,
        completionTime: instance.submitted_at && instance.started_at
          ? Math.round((new Date(instance.submitted_at).getTime() - new Date(instance.started_at).getTime()) / (1000 * 60))
          : null,
      })) || [];

      setParticipants(processedParticipants);

      // Fetch share data
      const { data: shareData, error: shareError } = await supabase
        .from('assessment_shares')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: false });

      if (shareError) throw shareError;
      setShares(shareData || []);

    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error Loading Analytics",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(participant => {
    if (selectedFilter === 'authenticated') return !participant.is_anonymous;
    if (selectedFilter === 'anonymous') return participant.is_anonymous;
    return true;
  });

  const stats = {
    total: participants.length,
    authenticated: participants.filter(p => !p.is_anonymous).length,
    anonymous: participants.filter(p => p.is_anonymous).length,
    completed: participants.filter(p => p.status === 'submitted').length,
    averageScore: participants.length > 0 
      ? Math.round(
          participants.filter(p => p.total_score !== null).reduce((sum, p) => sum + (p.total_score || 0), 0) / 
          participants.filter(p => p.total_score !== null).length || 1
        )
      : 0,
    averageCompletion: participants.length > 0 
      ? Math.round(
          participants.filter(p => p.completionTime !== null).reduce((sum, p) => sum + (p.completionTime || 0), 0) / 
          participants.filter(p => p.completionTime !== null).length || 1
        )
      : 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'evaluated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportData = () => {
    const csvData = filteredParticipants.map(p => ({
      'Type': p.is_anonymous ? 'Anonymous' : 'Authenticated',
      'Name': p.participant_name || 'N/A',
      'Email': p.participant_email || 'N/A',
      'Started': new Date(p.started_at).toLocaleString(),
      'Submitted': p.submitted_at ? new Date(p.submitted_at).toLocaleString() : 'N/A',
      'Status': p.status,
      'Score': p.total_score !== null ? `${p.total_score}/${p.max_possible_score}` : 'N/A',
      'Completion Time (min)': p.completionTime || 'N/A',
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(csvData[0] || {}).join(",") + "\n" +
      csvData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assessment-analytics-${assessmentId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.authenticated}</div>
            <p className="text-sm text-muted-foreground">Authenticated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <UserX className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.anonymous}</div>
            <p className="text-sm text-muted-foreground">Anonymous</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="shares">Share Links</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filter:</span>
              <div className="flex gap-1">
                {(['all', 'authenticated', 'anonymous'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={selectedFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter(filter)}
                  >
                    {filter === 'all' ? 'All' : filter === 'authenticated' ? 'Authenticated' : 'Anonymous'}
                  </Button>
                ))}
              </div>
            </div>
            
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Participants Table */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({filteredParticipants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredParticipants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No participants found for the selected filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParticipants.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell>
                            <Badge variant={participant.is_anonymous ? 'secondary' : 'default'}>
                              {participant.is_anonymous ? (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Anonymous
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Auth
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              {participant.participant_name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">{participant.participant_name}</span>
                                </div>
                              )}
                              {participant.participant_email && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{participant.participant_email}</span>
                                </div>
                              )}
                              {!participant.participant_name && !participant.participant_email && (
                                <span className="text-muted-foreground italic">No info provided</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(participant.started_at).toLocaleDateString()} {new Date(participant.started_at).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(participant.status)}>
                              {participant.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {participant.total_score !== null && participant.max_possible_score ? (
                              <span className={getScoreColor(participant.total_score, participant.max_possible_score)}>
                                {participant.total_score}/{participant.max_possible_score}
                                <span className="text-xs ml-1">
                                  ({Math.round((participant.total_score / participant.max_possible_score) * 100)}%)
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {participant.completionTime ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {participant.completionTime}m
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shares" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Share Links</CardTitle>
            </CardHeader>
            <CardContent>
              {shares.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Share className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No share links created yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shares.map((share) => (
                    <Card key={share.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={share.is_active ? 'default' : 'secondary'}>
                                {share.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                {share.access_count} views
                              </Badge>
                              <Badge variant="outline">
                                <Award className="h-3 w-3 mr-1" />
                                {share.completion_count} completed
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Created: {new Date(share.created_at).toLocaleDateString()}
                              {share.expires_at && (
                                <> • Expires: {new Date(share.expires_at).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <div className="flex flex-wrap gap-4">
                            {share.require_name && <span>• Requires name</span>}
                            {share.require_email && <span>• Requires email</span>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Average Score:</span>
                  <span className="font-medium">{stats.averageScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Completion Time:</span>
                  <span className="font-medium">{stats.averageCompletion} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Rate:</span>
                  <span className="font-medium">
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Participation Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Authenticated Users:</span>
                  <span className="font-medium">{stats.authenticated} ({stats.total > 0 ? Math.round((stats.authenticated / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Anonymous Users:</span>
                  <span className="font-medium">{stats.anonymous} ({stats.total > 0 ? Math.round((stats.anonymous / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Participants:</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.anonymous > 0 && (
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                <strong>Anonymous Participation:</strong> {stats.anonymous} participants accessed this assessment through share links, 
                representing {stats.total > 0 ? Math.round((stats.anonymous / stats.total) * 100) : 0}% of total participation.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;