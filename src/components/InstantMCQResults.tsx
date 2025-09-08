import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle,
  Clock, 
  Award, 
  BarChart3,
  FileText,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

interface MCQEvaluationResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  questionResults: {
    questionId: string;
    score: number;
    maxScore: number;
    isCorrect: boolean;
    selectedOptions: string[];
    correctOptions: string[];
  }[];
}

interface InstantMCQResultsProps {
  evaluation: MCQEvaluationResult;
  assessment: any;
  instance: any;
  durationTaken: number;
  shareUrl?: string;
  onRetakeAssessment?: () => void;
  onViewFullResults?: () => void;
}

const InstantMCQResults: React.FC<InstantMCQResultsProps> = ({
  evaluation,
  assessment,
  instance,
  durationTaken,
  shareUrl,
  onRetakeAssessment,
  onViewFullResults
}) => {
  const { totalScore, maxPossibleScore, percentage, questionResults } = evaluation;

  const getScoreColor = (perc: number) => {
    if (perc >= 80) return 'text-green-600';
    if (perc >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (perc: number): "default" | "secondary" | "destructive" => {
    if (perc >= 80) return 'default';
    if (perc >= 60) return 'secondary';
    return 'destructive';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const correctAnswers = questionResults.filter(q => q.isCorrect).length;
  const totalQuestions = questionResults.length;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${percentage >= 80 ? 'bg-green-100' : percentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <CheckCircle className={`h-8 w-8 ${percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
            </div>
            <CardTitle className="text-2xl">Assessment Completed!</CardTitle>
            <p className="text-muted-foreground">
              Your results for "{assessment.title}" are ready instantly
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
                  {totalScore}
                </span>
                <span className="text-muted-foreground">
                  /{maxPossibleScore}
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
              <div className="text-2xl font-bold">{formatDuration(durationTaken)}</div>
              <p className="text-sm text-muted-foreground">Time Taken</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{correctAnswers} / {totalQuestions}</div>
              <p className="text-sm text-muted-foreground">Correct Answers</p>
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

        {/* Question Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questionResults.map((result, index) => {
                const question = assessment.questions.find((q: any) => q.id === result.questionId);
                const questionPercentage = result.maxScore > 0 
                  ? Math.round((result.score / result.maxScore) * 100)
                  : 0;
                
                return (
                  <div key={result.questionId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          Question {index + 1}
                          {question?.title && `: ${question.title}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {result.isCorrect ? 'Correct' : 'Incorrect'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        <span className={getScoreColor(questionPercentage)}>
                          {result.score}
                        </span>
                        <span className="text-muted-foreground">
                          /{result.maxScore}
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

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {onViewFullResults && shareUrl && (
                <Button onClick={onViewFullResults}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Results
                </Button>
              )}
              
              {onRetakeAssessment && (
                <Button variant="outline" onClick={onRetakeAssessment}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Assessment
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => {
                  const shareText = `I scored ${percentage}% (${correctAnswers}/${totalQuestions} correct) on "${assessment.title}"`;
                  if (navigator.share) {
                    navigator.share({
                      title: `Assessment Results - ${assessment.title}`,
                      text: shareText,
                      url: shareUrl || window.location.href
                    }).catch(() => {
                      navigator.clipboard?.writeText(`${shareText}\n${shareUrl || window.location.href}`);
                    });
                  } else {
                    navigator.clipboard?.writeText(`${shareText}\n${shareUrl || window.location.href}`);
                  }
                }}
              >
                Share Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>✨ Results calculated instantly using advanced frontend evaluation</p>
          {shareUrl && (
            <p>📎 You can access these results anytime at: {shareUrl}</p>
          )}
          <p>Results have been saved and are available for future reference</p>
        </div>
      </div>
    </div>
  );
};

export default InstantMCQResults;