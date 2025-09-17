import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  FileText, 
  Code, 
  MessageSquare, 
  Upload,
  Mic,
  Award,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import InterviewAnalyticsDisplay from '@/components/interview/InterviewAnalyticsDisplay';

interface Question {
  id: string;
  title: string;
  question_type: 'project_based' | 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio' | 'interview';
  points: number;
  order_index: number;
}

interface Evaluation {
  id: string;
  submission_id: string;
  score: number;
  max_score: number;
  evaluated_at: string;
  ai_feedback?: any;
  feedback?: string;
  question_id?: string;
}

interface EnhancedResultsDisplayProps {
  assessmentId: string;
  instanceId: string;
  assessment: any;
  instance: any;
}

const EnhancedResultsDisplay: React.FC<EnhancedResultsDisplayProps> = ({
  assessmentId,
  instanceId,
  assessment,
  instance
}) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [retriggeringEvaluation, setRetriggeringEvaluation] = useState(false);

  useEffect(() => {
    loadResults();
  }, [instanceId]);

  const loadResults = async () => {
    try {
      // Load questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('order_index');

      if (questionsData) {
        setQuestions(questionsData);
        setMaxScore(questionsData.reduce((sum, q) => sum + q.points, 0));
      }

      // Load evaluations - first get submissions, then evaluations
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, question_id, answer')
        .eq('instance_id', instanceId);

      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map(s => s.id);
        
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select('*')
          .in('submission_id', submissionIds);

        if (evaluationsData) {
          // Add question_id to evaluations by matching submission_id
          const enhancedEvaluations = evaluationsData.map(evaluation => {
            const submission = submissions.find(s => s.id === evaluation.submission_id);
            return { ...evaluation, question_id: submission?.question_id };
          });
          
          setEvaluations(enhancedEvaluations);
          setTotalScore(evaluationsData.reduce((sum, e) => sum + (e.score || 0), 0));
        }
      }

    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <FileText className="w-4 h-4" />;
      case 'coding': return <Code className="w-4 h-4" />;
      case 'subjective': return <MessageSquare className="w-4 h-4" />;
      case 'file_upload': return <Upload className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'interview': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { variant: 'default' as const, text: 'Excellent', icon: Trophy };
    if (percentage >= 80) return { variant: 'secondary' as const, text: 'Good', icon: Award };
    if (percentage >= 70) return { variant: 'outline' as const, text: 'Average', icon: Target };
    return { variant: 'destructive' as const, text: 'Needs Improvement', icon: TrendingUp };
  };

  const calculatePercentage = () => maxScore > 0 ? Math.min(Math.round((totalScore / maxScore) * 100), 100) : 0;
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const retriggerEvaluation = async (questionId?: string) => {
    setRetriggeringEvaluation(true);
    try {
      console.log('Retriggering evaluation for instance:', instanceId);
      
      const { data, error } = await supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      });
      
      if (error) {
        console.error('Failed to retrigger evaluation:', error);
        return;
      }
      
      console.log('Evaluation retriggered successfully:', data);
      
      // Reload results after a short delay
      setTimeout(() => {
        loadResults();
      }, 2000);
      
    } catch (error) {
      console.error('Error retriggering evaluation:', error);
    } finally {
      setRetriggeringEvaluation(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const percentage = calculatePercentage();
  const performance = getPerformanceBadge(percentage);
  const PerformanceIcon = performance.icon;

  return (
    <div className="space-y-6">
      {/* Overall Results Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Assessment Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(totalScore, maxScore)}`}>
                {totalScore}
              </div>
              <div className="text-sm text-muted-foreground">Total Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{maxScore}</div>
              <div className="text-sm text-muted-foreground">Maximum Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{percentage}%</div>
              <div className="text-sm text-muted-foreground">Percentage</div>
            </div>
            <div className="text-center">
              <Badge variant={performance.variant} className="text-sm">
                <PerformanceIcon className="w-3 h-3 mr-1" />
                {performance.text}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Performance</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Time and Completion Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {formatDuration(instance?.duration_taken_seconds || instance?.duration_taken || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Time Taken</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {instance?.questions_answered || questions.length}
            </div>
            <div className="text-sm text-muted-foreground">Questions Answered</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {questions.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </CardContent>
        </Card>
      </div>

      {/* Question-by-Question Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div>No questions found for this assessment</div>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => retriggerEvaluation()}
                  disabled={retriggeringEvaluation}
                >
                  {retriggeringEvaluation ? 'Re-evaluating...' : 'Refresh Results'}
                </Button>
              </div>
            ) : (
              questions.map((question, index) => {
                const evaluation = evaluations.find(e => e.question_id === question.id);
                const score = evaluation?.score || 0;
                const questionPercentage = Math.round((score / question.points) * 100);
                
                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getQuestionIcon(question.question_type)}
                        <div>
                          <h4 className="font-medium">
                            Question {index + 1}: {question.title}
                          </h4>
                          <div className="text-sm text-muted-foreground">
                            {question.question_type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(score, question.points)}`}>
                          {score}/{question.points}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {questionPercentage}%
                        </div>
                      </div>
                    </div>
                    
                    <Progress value={questionPercentage} className="h-2" />
                  
                   {/* Interview Question - Show Comprehensive Analytics */}
                   {question.question_type === 'interview' ? (
                     <div className="mt-4">
                       <InterviewAnalyticsDisplay instanceId={instanceId} />
                     </div>
                   ) : evaluation?.ai_feedback ? (
                     <div className="mt-3 p-3 bg-muted rounded-lg">
                       <div className="text-sm space-y-3">
                           {evaluation.ai_feedback.selenium_analysis ? (
                            <div className="space-y-3">
                              <div>
                                <strong>Selenium Analysis:</strong> Overall Score {evaluation.ai_feedback.selenium_analysis?.seleniumScore?.overallScore || 0}/100
                              </div>
                              
                              {/* Locator Analysis */}
                              {(evaluation.ai_feedback.locator_analysis || evaluation.ai_feedback.selenium_analysis?.locatorAnalysis) && (
                                <div className="text-xs">
                                  <strong>Locator Quality:</strong>
                                  <ul className="list-disc ml-4 mt-1 space-y-1">
                                    {(evaluation.ai_feedback.locator_analysis || evaluation.ai_feedback.selenium_analysis?.locatorAnalysis || []).slice(0, 3).map((loc: any, i: number) => (
                                      <li key={i}>
                                        <code className="bg-gray-100 px-1 rounded text-xs">{loc.locator}</code> - {loc.stability}
                                        {loc.recommendation && <div className="text-muted-foreground mt-1">{loc.recommendation}</div>}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Best Practice Violations */}
                              {evaluation.ai_feedback.selenium_analysis?.bestPracticeViolations && (
                                <div className="text-xs">
                                  <strong>Issues Found:</strong>
                                  <ul className="list-disc ml-4 mt-1">
                                    {evaluation.ai_feedback.selenium_analysis.bestPracticeViolations.slice(0, 3).map((violation: string, i: number) => (
                                      <li key={i} className="text-red-600">{violation}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Improvements */}
                              {evaluation.ai_feedback.improvements && evaluation.ai_feedback.improvements.length > 0 && (
                                <div className="text-xs">
                                  <strong>Recommendations:</strong>
                                  <ul className="list-disc ml-4 mt-1">
                                    {evaluation.ai_feedback.improvements.slice(0, 3).map((improvement: string, i: number) => (
                                      <li key={i} className="text-green-600">{improvement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                             {/* Show detailed feedback if available */}
                             {evaluation.ai_feedback.detailed_feedback && (
                               <div className="text-xs text-muted-foreground mt-2">
                                 {evaluation.ai_feedback.detailed_feedback}
                               </div>
                             )}
                           </div>
                         ) : (
                           /* Standard AI feedback display */
                           <div>
                             <div>
                               <strong>AI Feedback:</strong> Evaluated using {evaluation.ai_feedback.evaluation_method} 
                               {evaluation.ai_feedback.confidence && ` with ${Math.round(evaluation.ai_feedback.confidence * 100)}% confidence`}
                             </div>
                             {evaluation.ai_feedback.detailed_feedback && (
                               <div className="text-xs text-muted-foreground">
                                 {evaluation.ai_feedback.detailed_feedback}
                               </div>
                             )}
                             {evaluation.ai_feedback.improvements && evaluation.ai_feedback.improvements.length > 0 && (
                               <div className="text-xs">
                                 <strong>Improvements:</strong>
                                 <ul className="list-disc ml-4 mt-1">
                                   {evaluation.ai_feedback.improvements.slice(0, 3).map((improvement: string, i: number) => (
                                     <li key={i}>{improvement}</li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     </div>
                   ) : evaluation?.feedback ? (
                     <div className="mt-3 p-3 bg-muted rounded-lg">
                       <div className="text-sm">
                         <strong>Feedback:</strong> {evaluation.feedback}
                       </div>
                     </div>
                   ) : (
                     <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                       <div className="text-sm text-yellow-800">
                         <strong>No detailed feedback available.</strong> Evaluation may be incomplete.
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="ml-2"
                           onClick={() => retriggerEvaluation(question.id)}
                           disabled={retriggeringEvaluation}
                         >
                           {retriggeringEvaluation ? 'Re-evaluating...' : 'Re-evaluate'}
                         </Button>
                       </div>
                     </div>
                   )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedResultsDisplay;