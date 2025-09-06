import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ProgressRing } from '@/components/ui/progress-ring';
import { GlassCard } from '@/components/ui/glass-card';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  Zap,
  Sparkles
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
  // Fixed: Restore real auth context
  const { user, profile } = useAuth();
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
      
      // Load real data from Supabase
      const { data: assessments, error } = await supabase
        .from('assessments')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false });

      const { data: instances } = await supabase
        .from('assessment_instances')
        .select('id, total_score, max_possible_score, participant_id');

      if (error) throw error;

      const totalAssessments = assessments?.length || 0;
      const activeAssessments = assessments?.filter(a => a.status === 'published').length || 0;
      const totalParticipants = new Set(instances?.map(i => i.participant_id)).size || 0;
      
      const avgScore = instances?.length 
        ? instances.reduce((sum, instance) => {
            const score = instance.total_score && instance.max_possible_score 
              ? (instance.total_score / instance.max_possible_score) * 100 
              : 0;
            return sum + score;
          }, 0) / instances.length
        : 0;

      setStats({
        totalAssessments,
        activeAssessments,
        totalParticipants,
        avgScore,
        recentActivity: totalAssessments
      });

      const processedAssessments: RecentAssessment[] = (assessments || []).slice(0, 5).map(assessment => ({
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        participants: 0,
        completion: 0,
        created_at: assessment.created_at,
        question_count: 0
      }));

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
      title: "Get Started",
      description: "Interactive platform tour and feature guide",
      icon: Play,
      color: "secondary",
      action: () => navigate('/onboarding')
    },
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
      case 'published': return 'default';
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
    <main className="min-h-screen hero-gradient">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-2xl shadow-elevation">
          <div className="glass-card p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary to-secondary shadow-glow">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Assessment Hub
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Elevate your assessment experience with AI-powered insights
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate('/assessments/create')}
                  className="gap-2 bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-xl transition-all duration-300 group"
                  size="lg"
                >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  Create Assessment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard variant="primary" className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={stats.totalAssessments} />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={(stats.totalAssessments / Math.max(stats.totalAssessments, 10)) * 100} size={50} />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                All time assessments created
              </p>
            </div>
          </GlassCard>

          <GlassCard variant="secondary" className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-accent to-secondary shadow-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Assessments</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={stats.activeAssessments} />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={(stats.activeAssessments / Math.max(stats.totalAssessments, 1)) * 100} size={50} />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3 text-orange-500" />
                Currently running
              </p>
            </div>
          </GlassCard>

          <GlassCard className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={stats.totalParticipants} />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={Math.min((stats.totalParticipants / 100) * 100, 100)} size={50} />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-500" />
                Across all assessments
              </p>
            </div>
          </GlassCard>

          <GlassCard className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={Math.round(stats.avgScore)} suffix="%" />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={stats.avgScore} size={50} showLabel />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Overall performance
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-gradient-to-r from-primary to-accent">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">
                  Jump into the most common assessment tasks
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <div 
                    key={index} 
                    className="group cursor-pointer p-4 rounded-xl bg-gradient-to-br from-card/50 to-card/20 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                    onClick={action.action}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {/* Assessment Types Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI-Powered Assessment Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {assessmentTypes.map((type, index) => {
                const Icon = type.icon;
                return (
                  <div key={index} className="text-center p-4 rounded-lg border">
                    <Icon className={`w-8 h-8 mx-auto mb-2 text-${type.color}`} />
                    <h4 className="font-medium">{type.title}</h4>
                    <p className="text-2xl font-bold">{type.count}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assessments */}
        {recentAssessments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAssessments.map((assessment) => {
                  const StatusIcon = getStatusIcon(assessment.status);
                  return (
                    <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/assessments/${assessment.id}/preview`)}>
                      <div className="flex items-center gap-4">
                        <StatusIcon className="w-5 h-5" />
                        <div>
                          <h4 className="font-medium">{assessment.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(assessment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(assessment.status)}>
                          {assessment.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Message for New Users */}
        {recentAssessments.length === 0 && (
          <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">Welcome to AssessAI!</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Experience the future of assessment with our comprehensive AI-powered platform. 
                Explore all features through our interactive onboarding or jump straight into creating your first assessment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/onboarding')} size="lg" className="gap-2">
                  <Play className="w-5 h-5" />
                  Start Platform Tour
                </Button>
                <Button variant="outline" onClick={() => navigate('/assessments/create')} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create First Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default MainDashboard;
