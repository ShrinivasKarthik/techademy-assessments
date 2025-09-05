import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Award, 
  Download, 
  Share,
  BarChart3,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  questions: any[];
}

interface AssessmentInstance {
  id: string;
  assessment_id: string;
  participant_name?: string;
  participant_email?: string;
  share_token: string;
  is_anonymous: boolean;
  session_state: string;
  started_at: string;
  time_remaining_seconds?: number;
  current_question_index: number;
  status: string;
  submitted_at?: string;
  total_score?: number;
  max_possible_score?: number;
}

interface Evaluation {
  id: string;
  submission_id: string;
  score: number;
  max_score: number;
  feedback?: string;
  ai_feedback?: any;
  evaluated_at: string;
}

interface PublicAssessmentResultsProps {
  instance: AssessmentInstance;
  assessment: Assessment;
}

const PublicAssessmentResults: React.FC<PublicAssessmentResultsProps> = ({
  instance,
  assessment,
}) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [maxPossibleScore, setMaxPossibleScore] = useState<number | null>(null);

  useEffect(() => {
    fetchResults();
  }, [instance.id]);

  const fetchResults = async () => {
    try {
      // Fetch submissions and their evaluations
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          question_id,
          answer,
          evaluations (*)
        `)
        .eq('instance_id', instance.id);

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        return;
      }

      let totalScoreSum = 0;
      let maxScoreSum = 0;
      const allEvaluations: Evaluation[] = [];

      submissions?.forEach((submission: any) => {
        submission.evaluations?.forEach((evaluation: any) => {
          allEvaluations.push(evaluation);
          totalScoreSum += evaluation.score || 0;
          maxScoreSum += evaluation.max_score || 0;
        });
      });

      setEvaluations(allEvaluations);
      setTotalScore(totalScoreSum);
      setMaxPossibleScore(maxScoreSum);

    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = () => {
    if (!totalScore || !maxPossibleScore || maxPossibleScore === 0) return 0;
    return Math.round((totalScore / maxPossibleScore) * 100);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  const percentage = calculatePercentage();
  const submissionTime = instance.submitted_at || new Date().toISOString();
  const duration = formatDuration(instance.started_at, instance.submitted_at);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Assessment Completed!</CardTitle>
            <p className="text-muted-foreground">
              Thank you for completing "{assessment.title}"
            </p>
          </CardHeader>
        </Card>

        {/* Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                <span className={getScoreColor(percentage)}>
                  {totalScore || 0}
                </span>
                <span className="text-muted-foreground">
                  /{maxPossibleScore || 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Total Score</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                <Badge variant={getScoreBadgeVariant(percentage)} className="text-lg px-3 py-1">
                  {percentage}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Percentage</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{duration}</div>
              <p className="text-sm text-muted-foreground">Time Taken</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{assessment.questions?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Questions</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Message */}
        <Alert>
          <AlertDescription>
            {percentage >= 80 && (
              <span className="text-green-600 font-medium">
                🎉 Excellent work! You performed exceptionally well on this assessment.
              </span>
            )}
            {percentage >= 60 && percentage < 80 && (
              <span className="text-yellow-600 font-medium">
                👍 Good job! You demonstrated solid understanding of the material.
              </span>
            )}
            {percentage < 60 && (
              <span className="text-red-600 font-medium">
                📚 Keep practicing! Consider reviewing the material and trying again.
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Participant Information */}
        {(instance.participant_name || instance.participant_email) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instance.participant_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{instance.participant_name}</p>
                  </div>
                )}
                {instance.participant_email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{instance.participant_email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(submissionTime).toLocaleDateString()} at{' '}
                    {new Date(submissionTime).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assessment ID</p>
                  <p className="font-mono text-sm">{instance.id.slice(0, 8)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question-wise Results */}
        {evaluations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {evaluations.map((evaluation, index) => {
                  const questionPercentage = evaluation.max_score > 0 
                    ? Math.round((evaluation.score / evaluation.max_score) * 100)
                    : 0;
                  
                  return (
                    <div key={evaluation.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Question {index + 1}</p>
                        {evaluation.feedback && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {evaluation.feedback}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          <span className={getScoreColor(questionPercentage)}>
                            {evaluation.score}
                          </span>
                          <span className="text-muted-foreground">
                            /{evaluation.max_score}
                          </span>
                        </div>
                        <Badge 
                          variant={getScoreBadgeVariant(questionPercentage)}
                          className="text-xs"
                        >
                          {questionPercentage}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.share?.({
                    title: `Assessment Results - ${assessment.title}`,
                    text: `I scored ${percentage}% on "${assessment.title}"`,
                    url: window.location.href
                  }).catch(() => {
                    // Fallback for browsers that don't support Web Share API
                    navigator.clipboard?.writeText(window.location.href);
                  });
                }}
              >
                <Share className="h-4 w-4 mr-2" />
                Share Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>This assessment was completed anonymously.</p>
          <p>Results are provided for informational purposes only.</p>
        </div>
      </div>
    </div>
  );
};

export default PublicAssessmentResults;