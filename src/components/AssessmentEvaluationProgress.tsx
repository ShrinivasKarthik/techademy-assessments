import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Code, 
  FileText, 
  MessageSquare,
  Trophy,
  AlertCircle,
  RotateCcw,
  Wifi,
  WifiOff,
  Upload,
  Mic,
  AlertTriangle,
  Brain,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useEvaluationRecovery } from '@/hooks/useEvaluationRecovery';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { EvaluationSkeletonCard } from '@/components/ui/skeleton-loader';
import { ProgressRing } from '@/components/ui/progress-ring';

interface Question {
  id: string;
  title: string;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  points: number;
  order_index: number;
}

interface Evaluation {
  id: string;
  submission_id: string;
  score: number;
  max_score: number;
  evaluated_at: string;
}

interface EvaluationStatus {
  questionId: string;
  status: 'pending' | 'evaluating' | 'completed' | 'error';
  score?: number;
  maxScore?: number;
}

interface AssessmentEvaluationProgressProps {
  assessmentId: string;
  instanceId: string;
}

const AssessmentEvaluationProgress: React.FC<AssessmentEvaluationProgressProps> = ({
  assessmentId,
  instanceId
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<any>(null);
  const [instance, setInstance] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [evaluationStatuses, setEvaluationStatuses] = useState<EvaluationStatus[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Timer for elapsed time display
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    initializeEvaluation();
  }, [assessmentId, instanceId]);

  useEffect(() => {
    if (questions.length > 0) {
      setupRealtimeSubscriptions();
    }
  }, [questions]);

  useEffect(() => {
    calculateProgress();
  }, [evaluationStatuses]);

  const initializeEvaluation = async () => {
    try {
      // Fetch assessment and instance data
      const [assessmentRes, instanceRes] = await Promise.all([
        supabase
          .from('assessments')
          .select(`
            id, title, description,
            questions!questions_assessment_id_fkey (
              id, title, question_type, points, order_index
            )
          `)
          .eq('id', assessmentId)
          .single(),
        supabase
          .from('assessment_instances')
          .select('*')
          .eq('id', instanceId)
          .single()
      ]);

      if (assessmentRes.error) throw assessmentRes.error;
      if (instanceRes.error) throw instanceRes.error;

      const sortedQuestions = assessmentRes.data.questions.sort((a, b) => a.order_index - b.order_index);
      
      setAssessment(assessmentRes.data);
      setInstance(instanceRes.data);
      setQuestions(sortedQuestions);

      // Initialize evaluation statuses
      const statuses: EvaluationStatus[] = sortedQuestions.map(question => ({
        questionId: question.id,
        status: question.question_type === 'mcq' ? 'evaluating' : 'pending',
        maxScore: question.points
      }));

      setEvaluationStatuses(statuses);
      setMaxPossibleScore(sortedQuestions.reduce((sum, q) => sum + q.points, 0));

      // Check if evaluation is already complete
      if (instanceRes.data.status === 'evaluated') {
        await loadExistingEvaluations();
      } else {
        // Start evaluation process
        await triggerEvaluation();
      }

    } catch (error) {
      console.error('Error initializing evaluation:', error);
      setError('Failed to initialize evaluation process');
    }
  };

  const loadExistingEvaluations = async () => {
    try {
      // First get all submissions for this instance
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, question_id')
        .eq('instance_id', instanceId);

      if (submissionsError) throw submissionsError;

      // Then get evaluations for these submissions
      const submissionIds = submissions?.map(s => s.id) || [];
      
      if (submissionIds.length === 0) return;

      const { data: evaluations, error } = await supabase
        .from('evaluations')
        .select('*')
        .in('submission_id', submissionIds);

      if (error) throw error;

      // Create a map of submission_id to question_id
      const submissionMap = new Map(submissions.map(s => [s.id, s.question_id]));

      // Update statuses with completed evaluations
      setEvaluationStatuses(prev => prev.map(status => {
        const evaluation = evaluations?.find(e => {
          const questionId = submissionMap.get(e.submission_id);
          return questionId === status.questionId;
        });
        
        if (evaluation) {
          return {
            ...status,
            status: 'completed',
            score: evaluation.score,
            evaluation
          };
        }
        return status;
      }));

      setIsComplete(true);
      
      // Calculate final scores
      const finalScore = evaluations?.reduce((sum, e) => sum + (e.score || 0), 0) || 0;
      setTotalScore(finalScore);

    } catch (error) {
      console.error('Error loading evaluations:', error);
    }
  };

  const triggerEvaluation = async () => {
    try {
      // Trigger the evaluation function
      const { data, error } = await supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      });

      if (error) {
        console.error('Evaluation trigger error:', error);
        setError('Failed to start evaluation process');
      }
    } catch (error) {
      console.error('Error triggering evaluation:', error);
      setError('Failed to start evaluation process');
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to evaluation updates
    const evaluationsChannel = supabase
      .channel('evaluations_progress')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'evaluations'
        },
        (payload) => {
          handleEvaluationUpdate(payload.new);
        }
      )
      .subscribe();

    // Subscribe to instance updates
    const instanceChannel = supabase
      .channel('instance_progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assessment_instances',
          filter: `id=eq.${instanceId}`
        },
        (payload) => {
          handleInstanceUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(evaluationsChannel);
      supabase.removeChannel(instanceChannel);
    };
  };

  const handleEvaluationUpdate = async (evaluation: any) => {
    // Get the question ID from the submission
    const { data: submission } = await supabase
      .from('submissions')
      .select('question_id')
      .eq('id', evaluation.submission_id)
      .single();

    if (!submission) return;

    setEvaluationStatuses(prev => prev.map(status => {
      if (status.questionId === submission.question_id) {
        return {
          ...status,
          status: 'completed',
          score: evaluation.score,
          evaluation
        };
      }
      return status;
    }));

    // Update total score
    setTotalScore(prev => prev + (evaluation.score || 0));
  };

  const handleInstanceUpdate = (instance: any) => {
    setInstance(instance);
    
    if (instance.status === 'evaluated') {
      setIsComplete(true);
      setTimeout(() => {
        navigate(`/assessments/${assessmentId}/results/${instanceId}`);
      }, 2000);
    }
  };

  const calculateProgress = () => {
    const completedCount = evaluationStatuses.filter(s => s.status === 'completed').length;
    const evaluatingCount = evaluationStatuses.filter(s => s.status === 'evaluating').length;
    
    // MCQs should show as evaluating immediately, then complete quickly
    const progress = ((completedCount + (evaluatingCount * 0.5)) / evaluationStatuses.length) * 100;
    setOverallProgress(progress);

    // Mark questions as evaluating based on type
    setEvaluationStatuses(prev => prev.map(status => {
      if (status.status === 'pending') {
        const question = questions.find(q => q.id === status.questionId);
        if (question?.question_type === 'mcq') {
          return { ...status, status: 'evaluating' };
        }
      }
      return status;
    }));
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <FileText className="w-4 h-4" />;
      case 'coding': return <Code className="w-4 h-4" />;
      case 'subjective': return <MessageSquare className="w-4 h-4" />;
      case 'file_upload': return <Upload className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'evaluating':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string, questionType: string) => {
    switch (status) {
      case 'completed':
        return 'Evaluated';
      case 'evaluating':
        return questionType === 'mcq' ? 'Checking answer...' : 'AI evaluating...';
      case 'error':
        return 'Evaluation failed';
      default:
        return 'Waiting in queue...';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Evaluation Error</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry Evaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Evaluating Assessment
                </CardTitle>
                <p className="text-muted-foreground">
                  {assessment?.title} • Processing your responses
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>Time elapsed: {formatTime(timeElapsed)}</div>
                <div>Questions: {questions.length}</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(overallProgress)}% Complete
              </span>
            </div>
            <Progress value={overallProgress} className="w-full" />
            
            {overallProgress > 0 && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalScore}</div>
                  <div className="text-sm text-muted-foreground">Points Scored</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{maxPossibleScore}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Status */}
        <Card>
          <CardHeader>
            <CardTitle>Question Evaluation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluationStatuses.map((status, index) => {
                const question = questions.find(q => q.id === status.questionId);
                if (!question) return null;

                return (
                  <div
                    key={status.questionId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getQuestionIcon(question.question_type)}
                      <div>
                        <div className="font-medium">
                          Question {index + 1}: {question.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {question.question_type.toUpperCase()} • {question.points} points
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {status.status === 'completed' && (
                        <Badge variant="secondary">
                          {status.score}/{status.maxScore}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.status)}
                        <span className="text-sm">
                          {getStatusText(status.status, question.question_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Completion Message */}
        {isComplete && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="text-center p-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Evaluation Complete!</h3>
              <p className="text-muted-foreground mb-4">
                Your assessment has been fully evaluated. You will be redirected to see your detailed results.
              </p>
              <Button onClick={() => navigate(`/assessments/${assessmentId}/results/${instanceId}`)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                View Detailed Results
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Alert */}
        {!isComplete && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Multiple-choice questions</strong> are evaluated instantly, while 
              <strong> coding and subjective questions</strong> use AI evaluation which may take 30-60 seconds per question.
              Please keep this page open until evaluation is complete.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default AssessmentEvaluationProgress;