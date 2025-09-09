import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Eye, 
  Download, 
  Users, 
  Clock, 
  Trophy, 
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  created_at: string;
  creator_id: string;
}

interface ParticipantResult {
  id: string;
  participant_name: string;
  participant_email: string;
  participant_id: string;
  started_at: string;
  submitted_at: string;
  total_score: number;
  max_possible_score: number;
  integrity_score: number;
  status: string;
  time_remaining_seconds: number;
  duration_taken: number;
  duration_taken_seconds?: number;
  questions_answered?: number;
}

const AssessmentResultsView: React.FC = () => {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [participants, setParticipants] = useState<ParticipantResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    if (selectedAssessment) {
      loadAssessmentResults();
    }
  }, [selectedAssessment]);

  const loadAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, description, duration_minutes, created_at, creator_id')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load assessments",
        variant: "destructive",
      });
    }
  };

  const loadAssessmentResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          participant_name,
          participant_email,
          participant_id,
          started_at,
          submitted_at,
          total_score,
          max_possible_score,
          integrity_score,
          status,
          time_remaining_seconds
        `)
        .eq('assessment_id', selectedAssessment)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const results: ParticipantResult[] = (data || []).map((instance: any) => {
        const assessment = assessments.find(a => a.id === selectedAssessment);
        const durationTaken = assessment 
          ? (assessment.duration_minutes * 60) - (instance.time_remaining_seconds || 0)
          : 0;

        return {
          ...instance,
          duration_taken: durationTaken
        };
      });

      setParticipants(results);
    } catch (error) {
      console.error('Error loading assessment results:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 0) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'evaluated':
        return <Badge variant="default"><Trophy className="w-3 h-3 mr-1" />Evaluated</Badge>;
      default:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getIntegrityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  const cleanupStuckAssessments = async () => {
    try {
      toast({
        title: "Starting cleanup",
        description: "Auto-submitting stuck assessments and triggering evaluations...",
      });

      const { data, error } = await supabase.functions.invoke('cleanup-stuck-assessments');

      if (error) {
        throw error;
      }

      const result = data as any;
      toast({
        title: "Cleanup completed",
        description: `Auto-submitted ${result.processed} stuck assessments. Triggered ${result.evaluations_triggered} evaluations.`,
      });

      // Reload results if an assessment is selected
      if (selectedAssessment) {
        setTimeout(loadAssessmentResults, 2000);
      }

    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Cleanup failed",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const filteredParticipants = participants.filter(p =>
    p.participant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.participant_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAssessmentData = assessments.find(a => a.id === selectedAssessment);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Assessment Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assessment to view results" />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map(assessment => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {assessment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={loadAssessmentResults} 
              disabled={!selectedAssessment || loading}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Results
            </Button>
          </div>

          {selectedAssessmentData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold">{selectedAssessmentData.title}</h3>
              <p className="text-sm text-muted-foreground">{selectedAssessmentData.description}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedAssessmentData.duration_minutes} minutes
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {participants.length} participants
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created {formatDate(selectedAssessmentData.created_at)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAssessment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Participant Results</CardTitle>
              <div className="flex gap-2">
                <Button onClick={cleanupStuckAssessments} variant="outline" size="sm" className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cleanup Stuck
                </Button>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search participants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredParticipants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date Taken</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Integrity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.participant_name || 'Anonymous'}
                      </TableCell>
                      <TableCell>{participant.participant_email || '-'}</TableCell>
                      <TableCell>{formatDate(participant.submitted_at || participant.started_at)}</TableCell>
                      <TableCell>{formatDuration(participant.duration_taken_seconds || participant.duration_taken || 0)}</TableCell>
                      <TableCell>
                        <div className={`font-semibold ${getScoreColor(participant.total_score || 0, participant.max_possible_score || 100)}`}>
                          {participant.total_score || 0}/{participant.max_possible_score || 100}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.round(((participant.total_score || 0) / (participant.max_possible_score || 100)) * 100)}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getIntegrityBadge(participant.integrity_score || 100)}
                      </TableCell>
                      <TableCell>{getStatusBadge(participant.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {selectedAssessment ? 'No participants found for this assessment' : 'Select an assessment to view results'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentResultsView;