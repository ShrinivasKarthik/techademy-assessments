import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  BarChart3,
  Eye,
  FileText,
  Camera,
  Mic
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DetailedResult {
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
    proctoring_config: any;
  } | null;
  evaluations: Array<{
    id: string;
    score: number;
    max_score: number;
    feedback: string;
    ai_feedback: any;
    integrity_score: number;
    proctoring_notes: string;
    submissions: {
      id: string;
      answer: any;
      questions: {
        id: string;
        title: string;
        question_type: string;
        points: number;
        config: any;
      } | null;
    } | null;
  }> | null;
  proctoring_reports: Array<{
    id: string;
    report_data: any;
    integrity_score: number;
    violations_summary: any[];
    recommendations: string;
  }> | null;
}

const AssessmentResultsPage = () => {
  const { assessmentId, instanceId } = useParams<{ assessmentId: string; instanceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [result, setResult] = useState<DetailedResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (assessmentId && instanceId) {
      loadDetailedResults();
    }
  }, [assessmentId, instanceId]);

  const loadDetailedResults = async () => {
    try {
      setLoading(true);
      
      const { data: instance, error } = await supabase
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
            proctoring_enabled,
            proctoring_config
          ),
          evaluations (
            id,
            score,
            max_score,
            feedback,
            ai_feedback,
            integrity_score,
            proctoring_notes,
            submissions (
              id,
              answer,
              questions (
                id,
                title,
                question_type,
                points,
                config
              )
            )
          ),
          proctoring_reports (
            id,
            report_data,
            integrity_score,
            violations_summary,
            recommendations
          )
        `)
        .eq('id', instanceId)
        .eq('participant_id', user?.id)
        .single();

      if (error) throw error;
      
      // Filter out invalid data
      const assessments = instance?.assessments;
      if (assessments && typeof assessments === 'object' && !('error' in assessments) && 'title' in assessments) {
        setResult(instance as unknown as DetailedResult);
      } else {
        throw new Error('Invalid assessment data');
      }

    } catch (error) {
      console.error('Error loading detailed results:', error);
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

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <CheckCircle className="w-4 h-4" />;
      case 'subjective': return <FileText className="w-4 h-4" />;
      case 'coding': return <BarChart3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading detailed results...</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Results Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested assessment results could not be found.</p>
            <Button onClick={() => navigate('/results')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const overallPercentage = result.max_possible_score > 0 
    ? (result.total_score / result.max_possible_score) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/results')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{result.assessments?.title}</h1>
          <p className="text-muted-foreground mb-4">{result.assessments?.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Completed on {formatDate(result.submitted_at)}
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Overall Score</span>
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(result.total_score, result.max_possible_score)}`}>
                {overallPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {result.total_score?.toFixed(1)} / {result.max_possible_score} points
              </div>
            </CardContent>
          </Card>

          {result.assessments?.proctoring_enabled && (
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Integrity Score</span>
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div className="text-3xl font-bold text-success">
                  {result.integrity_score?.toFixed(1) || 100}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {result.proctoring_summary?.violations_count || 0} violations detected
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <CheckCircle className="w-5 h-5 text-warning" />
              </div>
              <div className="text-2xl font-bold">
                {result.status === 'evaluated' ? 'Evaluated' : 'Submitted'}
              </div>
              <Badge className="mt-2" variant={result.status === 'evaluated' ? 'default' : 'secondary'}>
                {result.status === 'evaluated' ? 'Complete' : 'Pending Review'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results Tabs */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Question Breakdown</TabsTrigger>
            <TabsTrigger value="proctoring">Proctoring Report</TabsTrigger>
            <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Question-by-Question Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {result.evaluations?.map((evaluation, index) => (
                  <Card key={evaluation.id} className="mb-4">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getQuestionTypeIcon(evaluation.submissions?.questions?.question_type)}
                          <div>
                            <h4 className="font-semibold">
                              Question {index + 1}: {evaluation.submissions?.questions?.title}
                            </h4>
                            <Badge variant="outline" className="mt-1">
                              {evaluation.submissions?.questions?.question_type?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreColor(evaluation.score, evaluation.max_score)}`}>
                            {evaluation.score?.toFixed(1)} / {evaluation.max_score}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {evaluation.max_score > 0 ? `${((evaluation.score / evaluation.max_score) * 100).toFixed(1)}%` : '0%'}
                          </div>
                        </div>
                      </div>

                      {evaluation.feedback && (
                        <div className="bg-muted/50 p-4 rounded-lg mt-4">
                          <h5 className="font-medium mb-2">Feedback:</h5>
                          <p className="text-sm">{evaluation.feedback}</p>
                        </div>
                      )}

                      {evaluation.ai_feedback?.confidence && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          AI Evaluation Confidence: {(evaluation.ai_feedback.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proctoring" className="space-y-4">
            {result.assessments?.proctoring_enabled ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Proctoring Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.proctoring_reports?.map((report) => (
                    <div key={report.id} className="space-y-6">
                      {/* Proctoring Configuration */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          <span className="text-sm">
                            Camera: {result.assessments?.proctoring_config?.cameraRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4" />
                          <span className="text-sm">
                            Microphone: {result.assessments?.proctoring_config?.microphoneRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">
                            Face Detection: {result.assessments?.proctoring_config?.faceDetection ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">
                            Tab Switch Detection: {result.assessments?.proctoring_config?.tabSwitchDetection ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      {/* Violations Summary */}
                      {report.violations_summary && report.violations_summary.length > 0 ? (
                        <div>
                          <h4 className="font-semibold mb-3">Security Events Timeline</h4>
                          <div className="space-y-2">
                            {report.violations_summary.map((violation, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                                <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                                  violation.severity === 'critical' ? 'text-destructive' :
                                  violation.severity === 'high' ? 'text-warning' :
                                  'text-muted-foreground'
                                }`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{violation.type || 'Security Event'}</span>
                                    <Badge variant={
                                      violation.severity === 'critical' ? 'destructive' :
                                      violation.severity === 'high' ? 'default' :
                                      'secondary'
                                    }>
                                      {violation.severity || 'Low'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {violation.description || violation.message}
                                  </p>
                                  {violation.timestamp && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(violation.timestamp).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Shield className="w-16 h-16 mx-auto mb-4 text-success" />
                          <h3 className="text-lg font-semibold mb-2 text-success">Clean Assessment</h3>
                          <p className="text-muted-foreground">
                            No security violations detected during this assessment.
                          </p>
                        </div>
                      )}

                      {/* Recommendations */}
                      {report.recommendations && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                          <h5 className="font-medium mb-2">Recommendations:</h5>
                          <p className="text-sm">{report.recommendations}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Proctoring</h3>
                  <p className="text-muted-foreground">
                    Proctoring was not enabled for this assessment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Question Type Performance</h4>
                        <div className="space-y-3">
                          {Object.entries(
                            result.evaluations?.reduce((acc, evaluation) => {
                              const type = evaluation.submissions?.questions?.question_type || 'unknown';
                              if (!acc[type]) acc[type] = { total: 0, max: 0, count: 0 };
                              acc[type].total += evaluation.score;
                              acc[type].max += evaluation.max_score;
                              acc[type].count += 1;
                              return acc;
                            }, {} as Record<string, { total: number; max: number; count: number }>) || {}
                          ).map(([type, data]) => (
                        <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getQuestionTypeIcon(type)}
                            <span className="font-medium">{type.toUpperCase()}</span>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${getScoreColor(data.total, data.max)}`}>
                              {data.max > 0 ? `${((data.total / data.max) * 100).toFixed(1)}%` : '0%'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {data.count} question{data.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Assessment Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 border rounded-lg">
                        <span>Total Questions</span>
                        <span className="font-bold">{result.evaluations?.length || 0}</span>
                      </div>
                      <div className="flex justify-between p-3 border rounded-lg">
                        <span>Questions Correct</span>
                        <span className="font-bold text-success">
                          {result.evaluations?.filter(e => e.score === e.max_score).length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 border rounded-lg">
                        <span>Average Question Score</span>
                        <span className="font-bold">
                          {result.evaluations?.length 
                            ? (result.evaluations.reduce((sum, evaluation) => sum + (evaluation.max_score > 0 ? (evaluation.score / evaluation.max_score) * 100 : 0), 0) / result.evaluations.length).toFixed(1)
                            : 0
                          }%
                        </span>
                      </div>
                      {result.assessments?.proctoring_enabled && (
                        <div className="flex justify-between p-3 border rounded-lg">
                          <span>Integrity Rating</span>
                          <span className="font-bold text-success">
                            {result.integrity_score?.toFixed(1) || 100}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssessmentResultsPage;