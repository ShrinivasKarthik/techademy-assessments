import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  XCircle,
  Clock, 
  Award, 
  BarChart3,
  FileText,
  ExternalLink,
  RotateCcw,
  Shield,
  AlertTriangle,
  Eye,
  Camera,
  Monitor,
  Volume2,
  ChevronDown,
  ChevronUp
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
  proctoringData?: {
    violations: any[];
    summary: {
      integrity_score: number;
      violations_count: number;
      technical_issues: string[];
    };
  };
}

const InstantMCQResults: React.FC<InstantMCQResultsProps> = ({
  evaluation,
  assessment,
  instance,
  durationTaken,
  shareUrl,
  onRetakeAssessment,
  onViewFullResults,
  proctoringData
}) => {
  const { totalScore, maxPossibleScore, percentage, questionResults } = evaluation;
  const [violationsExpanded, setViolationsExpanded] = useState(false);

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

  const getViolationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'camera':
      case 'face_detection':
      case 'face_not_detected':
        return <Camera className="h-4 w-4" />;
      case 'screen':
      case 'tab_switch':
      case 'window_focus':
        return <Monitor className="h-4 w-4" />;
      case 'audio':
      case 'microphone':
        return <Volume2 className="h-4 w-4" />;
      case 'proctoring':
      case 'monitoring':
        return <Eye className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getViolationSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatViolationTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch {
      return timestamp;
    }
  };

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

        {/* Proctoring Results */}
        {proctoringData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Assessment Integrity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Integrity Score</span>
                  <Badge variant={proctoringData.summary.integrity_score >= 80 ? "default" : "destructive"}>
                    {proctoringData.summary.integrity_score}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Security Violations</span>
                  <Badge variant={proctoringData.summary.violations_count === 0 ? "default" : "destructive"}>
                    {proctoringData.summary.violations_count}
                  </Badge>
                </div>
                
                {proctoringData.summary.technical_issues.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Technical Issues:</span>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {proctoringData.summary.technical_issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Violations List */}
                <div className="space-y-2">
                  <Collapsible open={violationsExpanded} onOpenChange={setViolationsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
                        <span>Violation Details</span>
                        {violationsExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {proctoringData.violations.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
                          No violations detected during assessment
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {proctoringData.violations
                            .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime())
                            .map((violation, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${getViolationSeverityColor(violation.severity)} text-sm`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  {getViolationIcon(violation.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium capitalize">
                                      {violation.type?.replace(/_/g, ' ') || 'Security Event'}
                                    </span>
                                    {violation.severity && (
                                      <Badge 
                                        variant={violation.severity === 'critical' ? 'destructive' : 'secondary'}
                                        className="text-xs px-2 py-0"
                                      >
                                        {violation.severity}
                                      </Badge>
                                    )}
                                    {violation.timestamp && (
                                      <span className="text-xs opacity-75">
                                        {formatViolationTimestamp(violation.timestamp)}
                                      </span>
                                    )}
                                  </div>
                                  {violation.description && (
                                    <p className="text-xs opacity-90">
                                      {violation.description}
                                    </p>
                                  )}
                                  {violation.details && typeof violation.details === 'object' && (
                                    <div className="text-xs opacity-75 space-y-1">
                                      {Object.entries(violation.details).map(([key, value]) => (
                                        <div key={key}>
                                          <strong>{key.replace(/_/g, ' ')}:</strong> {String(value)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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