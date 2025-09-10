import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Calendar,
  BarChart3,
  Shield,
  TrendingUp
} from "lucide-react";

interface AssessmentResult {
  id: string;
  assessment_id: string;
  total_score: number;
  max_possible_score: number;
  integrity_score: number;
  status: string;
  submitted_at: string;
  proctoring_summary: any;
  assessments: {
    title: string;
    description: string;
    proctoring_enabled: boolean;
  } | null;
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    averageScore: 0,
    averageIntegrity: 0,
    completionRate: 100
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          assessment_id,
          total_score,
          max_possible_score,
          integrity_score,
          status,
          submitted_at,
          proctoring_summary,
          assessments (
            title,
            description,
            proctoring_enabled
          )
        `)
        .eq('participant_id', user?.id)
        .in('status', ['submitted', 'evaluated'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const resultsData = (instances || []).filter(instance => {
        const assessments = instance.assessments;
        return assessments && typeof assessments === 'object' && assessments !== null && 
               !Object.hasOwnProperty.call(assessments, 'error') && Object.hasOwnProperty.call(assessments, 'title');
      }) as unknown as AssessmentResult[];
      setResults(resultsData);

      // Calculate stats
      const totalAssessments = resultsData.length;
      const averageScore = totalAssessments > 0 
        ? resultsData.reduce((sum, r) => {
            const percentage = r.max_possible_score > 0 ? (r.total_score / r.max_possible_score) * 100 : 0;
            return sum + percentage;
          }, 0) / totalAssessments
        : 0;

      const averageIntegrity = totalAssessments > 0
        ? resultsData.reduce((sum, r) => sum + (r.integrity_score || 100), 0) / totalAssessments
        : 100;

      setStats({
        totalAssessments,
        averageScore,
        averageIntegrity,
        completionRate: 100 // All these are completed
      });

    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-destructive";
  };

  const getIntegrityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-success/10 text-success border-success">High Integrity</Badge>;
    if (score >= 70) return <Badge className="bg-warning/10 text-warning border-warning">Medium Integrity</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive">Low Integrity</Badge>;
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

  const viewDetailedResults = (instanceId: string, assessmentId: string) => {
    navigate(`/assessments/${assessmentId}/results/${instanceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Assessment Results</h1>
          <p className="text-muted-foreground">
            View your completed assessments and performance analytics
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Assessments</p>
                  <p className="text-2xl font-bold">{stats.totalAssessments}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Average Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore, 100)}`}>
                    {stats.averageScore.toFixed(1)}%
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Avg Integrity</p>
                  <p className="text-2xl font-bold text-success">{stats.averageIntegrity.toFixed(1)}%</p>
                </div>
                <Shield className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Performance</p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.averageScore > 75 ? 'Excellent' : stats.averageScore > 60 ? 'Good' : 'Improving'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Assessment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Complete some assessments to see your results here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-lg mb-1">
                                {result.assessments?.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {result.assessments?.description}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                Completed on {formatDate(result.submitted_at)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-muted-foreground">Score:</span>
                                <span className={`text-lg font-bold ${getScoreColor(result.total_score, result.max_possible_score)}`}>
                                  {result.max_possible_score > 0 
                                    ? `${Math.round((result.total_score / result.max_possible_score) * 100)}%`
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.total_score?.toFixed(1) || 0} / {result.max_possible_score || 0} points
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {result.assessments?.proctoring_enabled && (
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  {getIntegrityBadge(result.integrity_score || 100)}
                                </div>
                              )}
                              <Badge variant={result.status === 'evaluated' ? 'default' : 'secondary'}>
                                {result.status === 'evaluated' ? 'Evaluated' : 'Submitted'}
                              </Badge>
                              {result.proctoring_summary?.violations_count > 0 && (
                                <div className="flex items-center gap-1 text-warning">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span className="text-sm">
                                    {result.proctoring_summary.violations_count} violations
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              onClick={() => viewDetailedResults(result.id, result.assessment_id)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
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

export default ResultsPage;