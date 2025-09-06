import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Clock, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Calendar,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentResult {
  id: string;
  assessment_title: string;
  assessment_description: string;
  submitted_at: string;
  total_score: number;
  max_possible_score: number;
  integrity_score: number;
  status: string;
  evaluation_feedback: string;
  question_breakdown: any[];
}

const StudentResultsView: React.FC = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);

  useEffect(() => {
    loadStudentResults();
  }, []);

  const loadStudentResults = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch assessment instances for the current user
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          submitted_at,
          total_score,
          max_possible_score,
          integrity_score,
          status,
          assessments!inner (
            id,
            title,
            description
          ),
          evaluations (
            id,
            score,
            max_score,
            feedback,
            ai_feedback
          )
        `)
        .eq('participant_id', user.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const transformedResults = instances?.map((instance: any) => ({
        id: instance.id,
        assessment_title: instance.assessments.title,
        assessment_description: instance.assessments.description,
        submitted_at: instance.submitted_at,
        total_score: instance.total_score || instance.evaluations?.[0]?.score || 0,
        max_possible_score: instance.max_possible_score || instance.evaluations?.[0]?.max_score || 100,
        integrity_score: instance.integrity_score || 100,
        status: instance.status,
        evaluation_feedback: instance.evaluations?.[0]?.feedback || '',
        question_breakdown: instance.evaluations?.[0]?.ai_feedback || []
      })) || [];

      setResults(transformedResults);
    } catch (error) {
      console.error('Error loading student results:', error);
      toast({
        title: "Error",
        description: "Failed to load your results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-50 border-green-200';
    if (percentage >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getIntegrityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Review</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateOverallStats = () => {
    if (results.length === 0) return { avgScore: 0, avgIntegrity: 0, totalAssessments: 0 };
    
    const totalScore = results.reduce((sum, result) => sum + result.total_score, 0);
    const totalMaxScore = results.reduce((sum, result) => sum + result.max_possible_score, 0);
    const totalIntegrity = results.reduce((sum, result) => sum + result.integrity_score, 0);
    
    return {
      avgScore: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
      avgIntegrity: Math.round(totalIntegrity / results.length),
      totalAssessments: results.length
    };
  };

  const stats = calculateOverallStats();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{stats.totalAssessments}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(stats.avgScore, 100)}`}>
                  {stats.avgScore}%
                </p>
              </div>
              <Trophy className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Integrity Score</p>
                <p className="text-2xl font-bold text-green-600">{stats.avgIntegrity}%</p>
              </div>
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Your Assessment Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No assessment results found</p>
              <p className="text-sm text-muted-foreground">Complete an assessment to see your results here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <Card key={result.id} className={`transition-all hover:shadow-md ${getScoreBackground(result.total_score, result.max_possible_score)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{result.assessment_title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{result.assessment_description}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(result.submitted_at)}
                          </span>
                          {getIntegrityBadge(result.integrity_score)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getScoreColor(result.total_score, result.max_possible_score)}`}>
                            {result.total_score}/{result.max_possible_score}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Math.round((result.total_score / result.max_possible_score) * 100)}%
                          </div>
                          <Progress 
                            value={(result.total_score / result.max_possible_score) * 100} 
                            className="w-16 mt-1"
                          />
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedResult(result)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Result Modal/Drawer could be added here */}
      {selectedResult && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Detailed Results: {selectedResult.assessment_title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Final Score</p>
                  <p className={`text-xl font-bold ${getScoreColor(selectedResult.total_score, selectedResult.max_possible_score)}`}>
                    {selectedResult.total_score}/{selectedResult.max_possible_score} ({Math.round((selectedResult.total_score / selectedResult.max_possible_score) * 100)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Integrity Score</p>
                  <p className="text-xl font-bold text-green-600">{selectedResult.integrity_score}%</p>
                </div>
              </div>
              
              {selectedResult.evaluation_feedback && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Feedback</p>
                  <p className="text-sm">{selectedResult.evaluation_feedback}</p>
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => setSelectedResult(null)}
              >
                Close Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentResultsView;