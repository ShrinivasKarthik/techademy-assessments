import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Play, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Trophy,
  Calendar,
  Target
} from "lucide-react";

interface AvailableAssessment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  status: string;
  created_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [availableAssessments, setAvailableAssessments] = useState<AvailableAssessment[]>([]);
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      // Load available assessments
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('id, title, description, duration_minutes, status, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (assessmentsError) throw assessmentsError;

      // Load student's instances
      const { data: instances, error: instancesError } = await supabase
        .from('assessment_instances')
        .select('id, assessment_id, status, total_score, max_possible_score')
        .eq('participant_id', user?.id);

      if (instancesError) throw instancesError;

      const completedCount = instances?.filter(i => i.status === 'submitted' || i.status === 'evaluated').length || 0;
      const pendingCount = instances?.filter(i => i.status === 'in_progress').length || 0;
      
      const avgScore = instances?.length 
        ? instances.reduce((sum, instance) => {
            const score = instance.total_score && instance.max_possible_score 
              ? (instance.total_score / instance.max_possible_score) * 100 
              : 0;
            return sum + score;
          }, 0) / instances.length
        : 0;

      setStats({
        completed: completedCount,
        pending: pendingCount,
        avgScore
      });

      // Filter assessments not yet taken
      const takenAssessmentIds = new Set(instances?.map(i => i.assessment_id) || []);
      const availableAssessmentsFiltered = assessments?.filter(a => !takenAssessmentIds.has(a.id)) || [];
      
      setAvailableAssessments(availableAssessmentsFiltered);

    } catch (error) {
      console.error('Error loading student data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = (assessmentId: string) => {
    navigate(`/assessments/${assessmentId}/take`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Access your assessments and track your progress
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
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
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                View Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Check your completed assessments and performance analytics
              </p>
              <Button 
                onClick={() => navigate('/results')}
                className="w-full gap-2"
              >
                <Trophy className="w-4 h-4" />
                View My Results
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Browse Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Explore all available assessments from your instructors
              </p>
              <Button 
                onClick={() => navigate('/assessments')}
                variant="outline"
                className="w-full gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Browse All
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Available Assessments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Available Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableAssessments.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Available Assessments</h3>
                <p className="text-muted-foreground">
                  Check back later for new assessments from your instructors.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableAssessments.map((assessment) => (
                  <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{assessment.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assessment.description}
                          </p>
                        </div>
                        <Badge variant="secondary">New</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {assessment.duration_minutes}m
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button 
                        onClick={() => startAssessment(assessment.id)}
                        className="w-full gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Assessment
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;