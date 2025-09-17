import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
  WifiOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useEvaluationRecovery } from '@/hooks/useEvaluationRecovery';
import { useStableRealtime } from '@/hooks/useStableRealtime';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { EvaluationSkeletonCard } from '@/components/ui/skeleton-loader';
import { ProgressRing } from '@/components/ui/progress-ring';

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
}

interface EvaluationStatus {
  questionId: string;
  status: 'pending' | 'evaluating' | 'completed' | 'error';
  score?: number;
}

interface EnhancedAssessmentEvaluationProgressProps {
  assessmentId: string;
  instanceId: string;
}

const EnhancedAssessmentEvaluationProgress: React.FC<EnhancedAssessmentEvaluationProgressProps> = ({ 
  assessmentId, 
  instanceId 
}) => {
  const [assessment, setAssessment] = useState<any>(null);
  const [instance, setInstance] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [evaluationStatuses, setEvaluationStatuses] = useState<{ [key: string]: EvaluationStatus }>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationTimeout, setEvaluationTimeout] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Enhanced error recovery and network handling
  const { isOnline, reconnecting } = useNetworkStatus();
  const { saveProgress, loadProgress, clearProgress, retryEvaluation, isRetrying, retryCount } = useEvaluationRecovery();

  useEffect(() => {
    initializeEvaluation();
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Set evaluation timeout (10 minutes)
    const timeout = setTimeout(() => {
      setEvaluationTimeout(Date.now());
      toast({
        title: "Evaluation Timeout",
        description: "The evaluation is taking longer than expected. You can retry or check back later.",
        variant: "destructive"
      });
    }, 600000); // 10 minutes

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [assessmentId, instanceId]);

  const initializeEvaluation = async () => {
    try {
      setIsLoading(true);
      
      // Try to load saved progress first
      const savedProgress = loadProgress(instanceId);
      if (savedProgress && isOnline) {
        console.log('Loaded saved progress:', savedProgress);
        // Restore progress state
        setOverallProgress(savedProgress.progress);
        // Continue with normal loading
      }

      await loadData();
    } catch (error) {
      console.error('Error initializing evaluation:', error);
      setError('Failed to initialize evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData);

      // Load instance
      const { data: instanceData, error: instanceError } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (instanceError) throw instanceError;
      setInstance(instanceData);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('is_active', true)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Calculate max score
      const maxPossibleScore = (questionsData || []).reduce((sum, q) => sum + q.points, 0);
      setMaxScore(maxPossibleScore);

      // Set up realtime subscriptions
      setupRealtimeSubscriptions();

      // Check if evaluation should be triggered
      const shouldTriggerEvaluation = instanceData?.status === 'submitted' && 
        instanceData?.evaluation_status !== 'completed' &&
        instanceData?.evaluation_status !== 'in_progress';

      if (shouldTriggerEvaluation) {
        triggerEvaluation();
      } else {
        // Load existing evaluation data
        updateEvaluationProgress();
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load assessment data');
      
      if (!isOnline) {
        toast({
          title: "Network Error",
          description: "Please check your connection and try again",
          variant: "destructive"
        });
      }
    }
  };

  const triggerEvaluation = async () => {
    try {
      console.log('Triggering evaluation for instance:', instanceId);
      
      // Update status to in_progress
      await supabase
        .from('assessment_instances')
        .update({ evaluation_status: 'in_progress' })
        .eq('id', instanceId);
      
      const { data, error } = await supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      });

      if (error) {
        console.error('Error triggering evaluation:', error);
        await supabase
          .from('assessment_instances')
          .update({ evaluation_status: 'failed' })
          .eq('id', instanceId);
        
        setError('Failed to start evaluation');
        return;
      }

      console.log('Evaluation triggered successfully:', data);
      
      // Start tracking progress
      updateEvaluationProgress();
      
    } catch (error) {
      console.error('Error triggering evaluation:', error);
      setError('Failed to start evaluation');
      
      // Trigger retry if network is available
      if (isOnline && retryCount < 3) {
        setTimeout(() => retryEvaluation(instanceId), 5000);
      }
    }
  };

  const updateEvaluationProgress = async () => {
    try {
      // First get submissions for this instance
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, question_id')
        .eq('instance_id', instanceId);

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        return;
      }

      if (!submissions || submissions.length === 0) {
        console.log('No submissions found for instance');
        return;
      }

      // Then get evaluations for these submissions
      const submissionIds = submissions.map(s => s.id);
      const { data: evaluationsData, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .in('submission_id', submissionIds);

      if (evalError) {
        console.error('Error fetching evaluations:', evalError);
        return;
      }

      // Create a map of submission_id to question_id for easier lookup
      const submissionToQuestionMap = new Map(
        submissions.map(sub => [sub.id, sub.question_id])
      );

      // Update evaluation statuses
      const newStatuses: { [key: string]: EvaluationStatus } = {};
      let completedCount = 0;
      let newTotalScore = 0;
      const evaluatedQuestions: string[] = [];

      questions.forEach(question => {
        const evaluation = evaluationsData?.find(evaluation => {
          const questionId = submissionToQuestionMap.get(evaluation.submission_id);
          return questionId === question.id;
        });

        if (evaluation) {
          newStatuses[question.id] = {
            questionId: question.id,
            status: 'completed',
            score: evaluation.score || 0
          };
          completedCount++;
          newTotalScore += evaluation.score || 0;
          evaluatedQuestions.push(question.id);
        } else {
          newStatuses[question.id] = {
            questionId: question.id,
            status: 'pending',
            score: 0
          };
        }
      });

      setEvaluationStatuses(newStatuses);
      setTotalScore(newTotalScore);
      
      const progress = questions.length > 0 ? (completedCount / questions.length) * 100 : 0;
      setOverallProgress(progress);

      // Save progress for recovery
      if (isOnline) {
        saveProgress({
          assessmentId,
          instanceId,
          evaluationStatus: instance?.evaluation_status || 'in_progress',
          progress,
          evaluatedQuestions,
          lastUpdated: Date.now()
        });
      }

      // Calculate estimated time remaining
      if (completedCount > 0 && completedCount < questions.length) {
        const avgTimePerQuestion = elapsedTime / completedCount;
        const remainingQuestions = questions.length - completedCount;
        setEstimatedTimeRemaining(avgTimePerQuestion * remainingQuestions);
      }

      // Clear progress when evaluation is complete
      if (progress === 100) {
        clearProgress(instanceId);
      }

    } catch (error) {
      console.error('Error updating evaluation progress:', error);
    }
  };

  // Real-time subscriptions using useStableRealtime
  useStableRealtime({
    table: 'evaluations',
    onInsert: () => {
      console.log('New evaluation received');
      updateEvaluationProgress();
    }
  });

  useStableRealtime({
    table: 'assessment_instances',
    filter: `id=eq.${instanceId}`,
    onUpdate: (payload) => {
      console.log('Instance status updated:', payload);
      setInstance(payload.new);
      
      // Handle evaluation status changes
      if (payload.new.evaluation_status === 'completed') {
        updateEvaluationProgress();
        clearProgress(instanceId);
        
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
      
      if (payload.new.evaluation_status === 'failed') {
        setError('Evaluation failed. Please try again.');
      }
    }
  });

  const setupRealtimeSubscriptions = () => {
    // Subscriptions now handled by useStableRealtime hooks above
    return () => {
      // Cleanup handled by useStableRealtime
    };
  };

  // Helper functions
  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'coding': return Code;
      case 'mcq': return FileText;
      case 'subjective': return MessageSquare;
      case 'file_upload': return FileText;
      case 'audio': return MessageSquare;
      default: return FileText;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'evaluating': return Loader2;
      case 'error': return XCircle;
      default: return Clock;
    }
  };

  const getQuestionTypeText = (type: string) => {
    switch (type) {
      case 'coding': return 'Coding';
      case 'mcq': return 'Multiple Choice';
      case 'subjective': return 'Subjective';
      case 'file_upload': return 'File Upload';
      case 'audio': return 'Audio';
      default: return 'Question';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Evaluated';
      case 'evaluating': return 'Evaluating...';
      case 'error': return 'Error';
      default: return 'Pending';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <EvaluationSkeletonCard />
          <EvaluationSkeletonCard />
          <EvaluationSkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <h2 className="text-xl font-semibold">Evaluation Error</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            
            {/* Network status indicator */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm text-muted-foreground">
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              
              {isOnline && (
                <Button 
                  onClick={() => retryEvaluation(instanceId)}
                  disabled={isRetrying}
                  variant="default"
                  className="flex-1"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  {isRetrying ? 'Retrying...' : 'Retry Evaluation'}
                </Button>
              )}
            </div>
            
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Retry attempt: {retryCount}/5
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = overallProgress === 100 && instance?.evaluation_status === 'completed';
  const isTimedOut = evaluationTimeout && !isCompleted;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Network Status Bar */}
        {(!isOnline || reconnecting) && (
          <Alert className="border-warning bg-warning/10">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              {reconnecting ? 'Reconnecting...' : 'You are offline. Progress will be saved when connection is restored.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Header Card */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-2xl font-bold">{assessment?.title || 'Assessment'}</h1>
                <p className="text-muted-foreground">Evaluation Progress</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(elapsedTime)}</span>
                  </div>
                  {estimatedTimeRemaining && !isCompleted && (
                    <div className="text-xs text-muted-foreground">
                      ~{formatTime(estimatedTimeRemaining)} remaining
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="hidden md:block">
                  <ProgressRing progress={overallProgress} size={48} showLabel />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Overall Progress Card */}
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Overall Progress</h3>
                <div className="flex items-center space-x-2">
                  <AnimatedCounter 
                    value={overallProgress} 
                    suffix="%" 
                    className="text-2xl font-bold"
                  />
                  {isCompleted && (
                    <CheckCircle className="h-6 w-6 text-green-500 animate-scale-in" />
                  )}
                </div>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-semibold">
                    <AnimatedCounter value={totalScore} decimals={1} /> / {maxScore} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="font-semibold">
                    {Object.values(evaluationStatuses).filter(s => s.status === 'completed').length} / {questions.length} completed
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeout Warning */}
        {isTimedOut && (
          <Alert className="border-warning bg-warning/10 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The evaluation is taking longer than expected. This might be due to high server load or complex questions.
              <div className="mt-2 flex space-x-2">
                <Button 
                  onClick={() => retryEvaluation(instanceId)}
                  disabled={isRetrying}
                  size="sm"
                  variant="outline"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Retry Evaluation
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Questions Status */}
        <Card className="animate-fade-in">
          <CardHeader>
            <h3 className="text-lg font-semibold">Questions Status</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questions.map((question, index) => {
                const status = evaluationStatuses[question.id];
                const Icon = getQuestionIcon(question.question_type);
                const StatusIcon = getStatusIcon(status?.status || 'pending');
                
                return (
                  <div 
                    key={question.id} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:shadow-sm ${
                      status?.status === 'completed' ? 'bg-green-50 border-green-200' : 
                      status?.status === 'evaluating' ? 'bg-blue-50 border-blue-200' : 
                      'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2 md:mb-0">
                      <div className="flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate">{question.title}</h4>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{getQuestionTypeText(question.question_type)}</span>
                          <span>•</span>
                          <span>{question.points} point{question.points !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end space-x-3">
                      {status?.status === 'completed' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <AnimatedCounter value={status.score || 0} decimals={1} /> / {question.points}
                        </Badge>
                      )}
                      
                      {status?.status === 'evaluating' && (
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`h-5 w-5 ${
                          status?.status === 'completed' ? 'text-green-500' :
                          status?.status === 'evaluating' ? 'text-blue-500 animate-spin' :
                          'text-gray-400'
                        }`} />
                        <span className="text-sm font-medium whitespace-nowrap">
                          {getStatusText(status?.status || 'pending')}
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
        {isCompleted && (
          <Card className="border-green-200 bg-green-50 animate-scale-in">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Trophy className="h-12 w-12 text-green-500 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-green-800">Evaluation Complete! 🎉</h3>
                  <p className="text-green-700">
                    Your assessment has been evaluated successfully.
                  </p>
                  <div className="text-lg font-semibold text-green-800">
                    Final Score: <AnimatedCounter value={totalScore} decimals={1} /> / {maxScore} points
                  </div>
                  <div className="text-sm text-green-600">
                    Percentage: <AnimatedCounter value={(totalScore / maxScore) * 100} decimals={1} />%
                  </div>
                </div>
                <Button 
                  onClick={() => navigate(`/assessments/${assessmentId}/results/${instanceId}`)}
                  className="bg-green-600 hover:bg-green-700 hover-scale"
                  size="lg"
                >
                  View Detailed Results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Alert */}
        {!isCompleted && !isTimedOut && (
          <Alert className="animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Evaluation in Progress:</strong> Your submitted answers are being evaluated. 
              Multiple-choice questions are scored instantly, while coding and subjective questions 
              require AI analysis which may take a few minutes per question.
              {estimatedTimeRemaining && (
                <span className="block mt-1 text-sm">
                  Estimated time remaining: {formatTime(estimatedTimeRemaining)}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default EnhancedAssessmentEvaluationProgress;