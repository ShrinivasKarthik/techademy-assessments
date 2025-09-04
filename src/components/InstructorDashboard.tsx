import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Plus, 
  Users, 
  Activity, 
  Shield,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    totalParticipants: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstructorData();
  }, []);

  const loadInstructorData = async () => {
    try {
      setLoading(true);
      
      const { data: assessments, error } = await supabase
        .from('assessments')
        .select('id, status')
        .eq('creator_id', user?.id);

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
        avgScore
      });

    } catch (error) {
      console.error('Error loading instructor data:', error);
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
      description: "Design new assessments",
      icon: Plus,
      action: () => navigate('/assessments/create')
    },
    {
      title: "Monitor Live",
      description: "Real-time monitoring",
      icon: Activity,
      action: () => navigate('/monitoring')
    },
    {
      title: "Proctoring",
      description: "Secure supervision",
      icon: Shield,
      action: () => navigate('/proctoring')
    },
    {
      title: "Analytics",
      description: "Performance insights",
      icon: BarChart3,
      action: () => navigate('/advanced-analytics')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Instructor Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your assessments and monitor student progress
            </p>
          </div>
          <Button onClick={() => navigate('/assessments/create')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Assessment
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">My Assessments</p>
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
                  <p className="text-muted-foreground text-sm">Active</p>
                  <p className="text-2xl font-bold">{stats.activeAssessments}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Students</p>
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
                  <p className="text-muted-foreground text-sm">Avg Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={action.action}>
                <CardContent className="p-6 text-center">
                  <Icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;