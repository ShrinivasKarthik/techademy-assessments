import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  Eye,
  Download
} from 'lucide-react';

interface ParticipantJourney {
  participant_id: string;
  participant_name: string;
  participant_email: string;
  journey_stages: JourneyStage[];
  overall_progress: number;
  current_stage: string;
  engagement_score: number;
  performance_trend: 'improving' | 'declining' | 'stable';
  risk_level: 'low' | 'medium' | 'high';
  total_assessments: number;
  completed_assessments: number;
  average_score: number;
  time_spent: number;
  last_activity: string;
}

interface JourneyStage {
  stage_name: string;
  timestamp: string;
  assessment_id?: string;
  assessment_title?: string;
  score?: number;
  time_spent?: number;
  status: 'completed' | 'in_progress' | 'abandoned';
  insights: string[];
}

interface ParticipantJourneyTrackerProps {
  assessmentId?: string;
}

const ParticipantJourneyTracker: React.FC<ParticipantJourneyTrackerProps> = ({
  assessmentId
}) => {
  const [journeys, setJourneys] = useState<ParticipantJourney[]>([]);
  const [filteredJourneys, setFilteredJourneys] = useState<ParticipantJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedJourney, setSelectedJourney] = useState<ParticipantJourney | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipantJourneys();
  }, [assessmentId]);

  useEffect(() => {
    filterJourneys();
  }, [journeys, selectedParticipant, riskFilter]);

  const fetchParticipantJourneys = async () => {
    try {
      setLoading(true);

      // Build query to get assessment instances with participant data
      let query = supabase
        .from('assessment_instances')
        .select(`
          id,
          participant_id,
          participant_name,
          participant_email,
          started_at,
          submitted_at,
          status,
          total_score,
          max_possible_score,
          time_remaining_seconds,
          current_question_index,
          assessments!inner(id, title, duration_minutes),
          submissions(id, question_id, submitted_at, answer)
        `);

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data: instances, error } = await query;

      if (error) throw error;

      // Process the data to create participant journeys
      const processedJourneys = processParticipantData(instances || []);
      setJourneys(processedJourneys);

    } catch (error) {
      console.error('Error fetching participant journeys:', error);
      toast({
        title: "Error",
        description: "Failed to load participant journey data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processParticipantData = (instances: any[]): ParticipantJourney[] => {
    const participantMap = new Map<string, any>();

    instances.forEach(instance => {
      const participantKey = instance.participant_id || instance.participant_email || instance.id;
      
      if (!participantMap.has(participantKey)) {
        participantMap.set(participantKey, {
          participant_id: participantKey,
          participant_name: instance.participant_name || 'Anonymous',
          participant_email: instance.participant_email || '',
          instances: [],
          submissions: []
        });
      }

      const participant = participantMap.get(participantKey);
      participant.instances.push(instance);
      if (instance.submissions) {
        participant.submissions.push(...instance.submissions);
      }
    });

    return Array.from(participantMap.values()).map(participant => {
      const journey = analyzeParticipantJourney(participant);
      return journey;
    });
  };

  const analyzeParticipantJourney = (participant: any): ParticipantJourney => {
    const instances = participant.instances;
    const submissions = participant.submissions;

    // Calculate overall metrics
    const totalAssessments = instances.length;
    const completedAssessments = instances.filter((i: any) => i.status === 'submitted').length;
    const overallProgress = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;

    // Calculate average score
    const scoresData = instances
      .filter((i: any) => i.total_score !== null && i.max_possible_score !== null)
      .map((i: any) => (i.total_score / i.max_possible_score) * 100);
    const averageScore = scoresData.length > 0 
      ? scoresData.reduce((sum, score) => sum + score, 0) / scoresData.length 
      : 0;

    // Calculate time spent
    const timeSpent = instances.reduce((total: number, instance: any) => {
      if (instance.assessments?.duration_minutes && instance.time_remaining_seconds !== null) {
        const totalTime = instance.assessments.duration_minutes * 60;
        const usedTime = totalTime - instance.time_remaining_seconds;
        return total + usedTime;
      }
      return total;
    }, 0);

    // Determine performance trend
    const performanceTrend = calculatePerformanceTrend(scoresData);

    // Calculate engagement score (based on completion rate, time spent, etc.)
    const engagementScore = calculateEngagementScore(instances, submissions);

    // Determine risk level
    const riskLevel = calculateRiskLevel(overallProgress, averageScore, engagementScore);

    // Generate journey stages
    const journeyStages = generateJourneyStages(instances, submissions);

    // Determine current stage
    const currentStage = determineCurrentStage(instances);

    return {
      participant_id: participant.participant_id,
      participant_name: participant.participant_name,
      participant_email: participant.participant_email,
      journey_stages: journeyStages,
      overall_progress: overallProgress,
      current_stage: currentStage,
      engagement_score: engagementScore,
      performance_trend: performanceTrend,
      risk_level: riskLevel,
      total_assessments: totalAssessments,
      completed_assessments: completedAssessments,
      average_score: averageScore,
      time_spent: Math.round(timeSpent / 60), // Convert to minutes
      last_activity: instances.length > 0 
        ? new Date(Math.max(...instances.map((i: any) => new Date(i.started_at).getTime()))).toISOString()
        : new Date().toISOString()
    };
  };

  const calculatePerformanceTrend = (scores: number[]): 'improving' | 'declining' | 'stable' => {
    if (scores.length < 2) return 'stable';
    
    const recent = scores.slice(-3);
    const earlier = scores.slice(0, -3);
    
    if (earlier.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, score) => sum + score, 0) / earlier.length;
    
    const diff = recentAvg - earlierAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  };

  const calculateEngagementScore = (instances: any[], submissions: any[]): number => {
    if (instances.length === 0) return 0;

    let score = 0;
    
    // Completion rate (40% weight)
    const completionRate = instances.filter((i: any) => i.status === 'submitted').length / instances.length;
    score += completionRate * 40;

    // Question attempt rate (30% weight)
    const totalQuestions = instances.reduce((sum: number, instance: any) => {
      // Estimate questions per assessment (would need actual data)
      return sum + 10; // Default assumption
    }, 0);
    
    const attemptRate = submissions.length / Math.max(totalQuestions, 1);
    score += Math.min(attemptRate, 1) * 30;

    // Time engagement (30% weight)
    const avgTimeSpent = instances.reduce((sum: number, instance: any) => {
      if (instance.assessments?.duration_minutes && instance.time_remaining_seconds !== null) {
        const totalTime = instance.assessments.duration_minutes * 60;
        const usedTime = totalTime - instance.time_remaining_seconds;
        const timeRatio = usedTime / totalTime;
        return sum + Math.min(timeRatio, 1);
      }
      return sum + 0.5; // Default if no time data
    }, 0) / instances.length;
    
    score += avgTimeSpent * 30;

    return Math.round(score);
  };

  const calculateRiskLevel = (progress: number, avgScore: number, engagement: number): 'low' | 'medium' | 'high' => {
    const riskScore = (progress + avgScore + engagement) / 3;
    
    if (riskScore >= 70) return 'low';
    if (riskScore >= 40) return 'medium';
    return 'high';
  };

  const generateJourneyStages = (instances: any[], submissions: any[]): JourneyStage[] => {
    const stages: JourneyStage[] = [];

    instances.forEach(instance => {
      stages.push({
        stage_name: 'Assessment Started',
        timestamp: instance.started_at,
        assessment_id: instance.assessments?.id,
        assessment_title: instance.assessments?.title,
        status: instance.status === 'submitted' ? 'completed' : 
                instance.status === 'in_progress' ? 'in_progress' : 'abandoned',
        score: instance.total_score && instance.max_possible_score 
          ? (instance.total_score / instance.max_possible_score) * 100 
          : undefined,
        time_spent: instance.assessments?.duration_minutes && instance.time_remaining_seconds !== null
          ? instance.assessments.duration_minutes - Math.round(instance.time_remaining_seconds / 60)
          : undefined,
        insights: generateStageInsights(instance, submissions)
      });
    });

    return stages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const generateStageInsights = (instance: any, submissions: any[]): string[] => {
    const insights: string[] = [];

    if (instance.status === 'submitted') {
      insights.push('Successfully completed assessment');
    } else if (instance.status === 'in_progress') {
      insights.push('Assessment in progress');
    } else {
      insights.push('Assessment was abandoned');
    }

    // Add more contextual insights based on performance
    if (instance.total_score && instance.max_possible_score) {
      const scorePercentage = (instance.total_score / instance.max_possible_score) * 100;
      if (scorePercentage >= 90) {
        insights.push('Excellent performance');
      } else if (scorePercentage >= 70) {
        insights.push('Good performance');
      } else if (scorePercentage >= 50) {
        insights.push('Average performance');
      } else {
        insights.push('Needs improvement');
      }
    }

    return insights;
  };

  const determineCurrentStage = (instances: any[]): string => {
    const latestInstance = instances.sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];

    if (!latestInstance) return 'Not Started';

    switch (latestInstance.status) {
      case 'in_progress':
        return 'Taking Assessment';
      case 'submitted':
        return 'Assessment Complete';
      default:
        return 'Inactive';
    }
  };

  const filterJourneys = () => {
    let filtered = journeys;

    if (selectedParticipant !== 'all') {
      filtered = filtered.filter(journey => journey.participant_id === selectedParticipant);
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(journey => journey.risk_level === riskFilter);
    }

    setFilteredJourneys(filtered);
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const exportJourneyData = () => {
    const csvData = filteredJourneys.map(journey => ({
      'Participant': journey.participant_name,
      'Email': journey.participant_email,
      'Progress': `${journey.overall_progress.toFixed(1)}%`,
      'Average Score': `${journey.average_score.toFixed(1)}%`,
      'Engagement Score': journey.engagement_score,
      'Risk Level': journey.risk_level,
      'Current Stage': journey.current_stage,
      'Total Assessments': journey.total_assessments,
      'Completed': journey.completed_assessments,
      'Time Spent (min)': journey.time_spent
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participant-journeys.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Participant Journey Analytics</h2>
          <p className="text-muted-foreground">
            Track participant progression and engagement patterns
          </p>
        </div>
        <Button onClick={exportJourneyData} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select participant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Participants</SelectItem>
            {journeys.map(journey => (
              <SelectItem key={journey.participant_id} value={journey.participant_id}>
                {journey.participant_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Journey Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{filteredJourneys.length}</div>
                <div className="text-sm text-muted-foreground">Total Participants</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredJourneys.length > 0 
                    ? Math.round(filteredJourneys.reduce((sum, j) => sum + j.overall_progress, 0) / filteredJourneys.length)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredJourneys.filter(j => j.risk_level === 'high').length}
                </div>
                <div className="text-sm text-muted-foreground">High Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {filteredJourneys.length > 0 
                    ? Math.round(filteredJourneys.reduce((sum, j) => sum + j.time_spent, 0) / filteredJourneys.length)
                    : 0}m
                </div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participant Journey List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredJourneys.map(journey => (
          <Card key={journey.participant_id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{journey.participant_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{journey.participant_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(journey.performance_trend)}
                  <Badge variant={getRiskBadgeVariant(journey.risk_level)}>
                    {journey.risk_level} risk
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <div className="flex items-center gap-2">
                    <Progress value={journey.overall_progress} className="flex-1" />
                    <span className="font-medium">{journey.overall_progress.toFixed(1)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Engagement</p>
                  <div className="flex items-center gap-2">
                    <Progress value={journey.engagement_score} className="flex-1" />
                    <span className="font-medium">{journey.engagement_score}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Assessments</p>
                  <p className="font-medium">{journey.completed_assessments}/{journey.total_assessments}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Score</p>
                  <p className="font-medium">{journey.average_score.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Spent</p>
                  <p className="font-medium">{journey.time_spent}m</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  {journey.current_stage}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedJourney(journey)}
                  className="gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View Journey
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJourneys.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No participant journeys found</p>
        </div>
      )}

      {/* Journey Detail Modal */}
      {selectedJourney && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedJourney.participant_name} - Journey Details</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedJourney.participant_email}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedJourney(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Journey Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Journey Timeline</h3>
                <div className="space-y-4">
                  {selectedJourney.journey_stages.map((stage, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        {stage.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : stage.status === 'in_progress' ? (
                          <Clock className="w-4 h-4 text-blue-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{stage.stage_name}</h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(stage.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {stage.assessment_title && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Assessment: {stage.assessment_title}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          {stage.score && (
                            <span>Score: {stage.score.toFixed(1)}%</span>
                          )}
                          {stage.time_spent && (
                            <span>Time: {stage.time_spent}m</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {stage.status}
                          </Badge>
                        </div>
                        {stage.insights.length > 0 && (
                          <div className="mt-2">
                            {stage.insights.map((insight, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                • {insight}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ParticipantJourneyTracker;