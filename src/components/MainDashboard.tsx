import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Code, 
  Users, 
  TrendingUp, 
  Clock, 
  Brain, 
  Play,
  Eye,
  Plus,
  BarChart3,
  Shield,
  Mic,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Activity,
  Settings,
  Zap
} from "lucide-react";


interface DashboardStats {
  totalAssessments: number;
  activeAssessments: number;
  totalParticipants: number;
  avgScore: number;
  recentActivity: number;
}

interface RecentAssessment {
  id: string;
  title: string;
  status: string;
  participants: number;
  completion: number;
  created_at: string;
  question_count: number;
}

const MainDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssessments: 0,
    activeAssessments: 0,
    totalParticipants: 0,
    avgScore: 0,
    recentActivity: 0
  });
  const [recentAssessments, setRecentAssessments] = useState<RecentAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch assessments with related data
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`
          *,
          questions (count),
          assessment_instances (
            id,
            status,
            total_score,
            max_possible_score
          )
        `)
        .order('created_at', { ascending: false });

      if (assessmentsError) throw assessmentsError;

      // Process dashboard statistics
      const totalAssessments = assessments?.length || 0;
      const activeAssessments = assessments?.filter(a => a.status === 'published').length || 0;
      
      let totalParticipants = 0;
      let totalScore = 0;
      let scoreCount = 0;

      const processedAssessments: RecentAssessment[] = assessments?.map(assessment => {
        const instances = assessment.assessment_instances || [];
        const participants = instances.length;
        totalParticipants += participants;

        // Calculate average score for completed instances
        instances.forEach((instance: any) => {
          if (instance.total_score && instance.max_possible_score) {
            totalScore += (instance.total_score / instance.max_possible_score) * 100;
            scoreCount++;
          }
        });

        const completedCount = instances.filter((i: any) => i.status === 'submitted').length;
        const completion = participants > 0 ? (completedCount / participants) * 100 : 0;

        return {
          id: assessment.id,
          title: assessment.title,
          status: assessment.status,
          participants,
          completion,
          created_at: assessment.created_at,
          question_count: assessment.questions?.[0]?.count || 0
        };
      }).slice(0, 5) || [];

      const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      setStats({
        totalAssessments,
        activeAssessments,
        totalParticipants,
        avgScore,
        recentActivity: totalAssessments
      });

      setRecentAssessments(processedAssessments);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Create Assessment",
      description: "Design new assessments with AI assistance",
      icon: Plus,
      color: "primary",
      action: () => navigate('/assessments/create')
    },
    {
      title: "View All Assessments",
      description: "Manage your assessment library",
      icon: BookOpen,
      color: "info",
      action: () => navigate('/assessments')
    },
    {
      title: "Advanced Analytics",
      description: "Deep insights and reporting",
      icon: BarChart3,
      color: "success",
      action: () => navigate('/advanced-analytics')
    },
    {
      title: "Live Monitoring",
      description: "Real-time assessment monitoring",
      icon: Activity,
      color: "warning",
      action: () => navigate('/monitoring')
    },
    {
      title: "Proctoring System",
      description: "Secure assessment supervision",
      icon: Shield,
      color: "primary",
      action: () => navigate('/proctoring')
    },
    {
      title: "Admin Dashboard",
      description: "System administration",
      icon: Settings,
      color: "info",
      action: () => navigate('/admin')
    }
  ];

  const assessmentTypes = [
    { icon: Code, title: "Coding", count: stats.totalAssessments, color: "primary" },
    { icon: CheckCircle, title: "MCQ", count: Math.floor(stats.totalAssessments * 0.6), color: "success" },
    { icon: FileText, title: "Subjective", count: Math.floor(stats.totalAssessments * 0.4), color: "info" },
    { icon: Upload, title: "File Upload", count: Math.floor(stats.totalAssessments * 0.2), color: "warning" },
    { icon: Mic, title: "Audio", count: Math.floor(stats.totalAssessments * 0.1), color: "primary" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return Play;
      case 'draft': return AlertCircle;
      case 'archived': return CheckCircle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-4" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Assessment Dashboard</h1>
            <p className="text-muted-foreground">
              Manage, monitor, and analyze your AI-powered assessments
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/assessments/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Assessments</p>
                  <p className="text-2xl font-bold">{stats.totalAssessments}</p>
                </div>
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-success">+{stats.recentActivity}</span>
                <span className="text-muted-foreground">this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Assessments</p>
                  <p className="text-2xl font-bold">{stats.activeAssessments}</p>
                </div>
                <Zap className="w-8 h-8 text-warning" />
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Activity className="w-3 h-3 text-info" />
                <span className="text-muted-foreground">Currently running</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Participants</p>
                  <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                </div>
                <Users className="w-8 h-8 text-info" />
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Users className="w-3 h-3 text-success" />
                <span className="text-muted-foreground">Across all assessments</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Average Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-success" />
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-success">Above average</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 justify-start hover:shadow-md transition-all"
                    onClick={action.action}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Assessment Types & Recent Assessments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assessment Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Assessment Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessmentTypes.map((type, index) => {
                const Icon = type.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-medium">{type.title}</span>
                    </div>
                    <Badge variant="secondary">{type.count}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Assessments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAssessments.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No assessments found</p>
                  <Button onClick={() => navigate('/assessments/create')}>
                    Create Your First Assessment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAssessments.map((assessment) => {
                    const StatusIcon = getStatusIcon(assessment.status);
                    return (
                      <div key={assessment.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-background-secondary/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{assessment.title}</h4>
                            <Badge variant={getStatusColor(assessment.status) as any} className="gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {assessment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {assessment.participants} participants
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {assessment.question_count} questions
                            </span>
                            <span>{assessment.completion.toFixed(1)}% completed</span>
                          </div>
                          {assessment.completion > 0 && (
                            <Progress value={assessment.completion} className="h-1 mt-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/assessments/${assessment.id}/preview`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/assessments/${assessment.id}/analytics`)}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;