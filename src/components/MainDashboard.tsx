import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
    if (user) {
      loadDashboardData();
    }
  }, [user, profile]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Simple query without complex joins to avoid TypeScript issues
      const { data: assessments, error } = await supabase
        .from('assessments')
        .select('id, title, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalAssessments = assessments?.length || 0;
      const activeAssessments = assessments?.filter(a => a.status === 'published').length || 0;

      setStats({
        totalAssessments,
        activeAssessments,
        totalParticipants: 0, // Will be populated when we have instance data
        avgScore: 0,
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
            </CardContent>
          </Card>
        </div>

        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">🎉 Authentication System Implemented!</h2>
          <p className="text-muted-foreground mb-4">
            Phase 1 complete: User authentication, profiles, and role-based access control are now active.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Try the Auth System
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
