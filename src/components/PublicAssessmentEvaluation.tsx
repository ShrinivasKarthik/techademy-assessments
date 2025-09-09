import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Brain,
  Loader2,
  ArrowRight,
  FileText,
  Code,
  MessageSquare,
  Upload,
  Mic
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStableRealtime } from '@/hooks/useStableRealtime';
import { useToast } from '@/hooks/use-toast';

interface PublicAssessmentEvaluationProps {
  shareToken: string;
  instanceId: string;
  assessment: any;
}

const PublicAssessmentEvaluation: React.FC<PublicAssessmentEvaluationProps> = ({
  shareToken,
  instanceId,
  assessment
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [evaluatedQuestions, setEvaluatedQuestions] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    initializeEvaluation();
    setupRealtimeSubscriptions();
    
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initializeEvaluation = async () => {
    try {
      // Calculate max possible score
      const totalPoints = assessment.questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0;
      setMaxScore(totalPoints);

      // Check if already evaluated
      const { data: instance } = await supabase
        .from('assessment_instances')
        .select('status, total_score, max_possible_score')
        .eq('id', instanceId)
        .single();

      if (instance?.status === 'evaluated') {
        setIsComplete(true);
        setTotalScore(instance.total_score || 0);
        setEvaluationProgress(100);
        return;
      }

      // Trigger evaluation
      await supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      });

    } catch (error) {
      console.error('Error initializing evaluation:', error);
      toast({
        title: "Evaluation Error",
        description: "Failed to start evaluation process",
        variant: "destructive"
      });
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to evaluation updates
  // Real-time subscriptions using useStableRealtime
  useStableRealtime({
    table: 'evaluations',
    onInsert: () => {
      updateProgress();
    }
  });

  useStableRealtime({
    table: 'assessment_instances',
    filter: `id=eq.${instanceId}`,
    onUpdate: (payload) => {
      if (payload.new.status === 'evaluated') {
        setIsComplete(true);
        setTotalScore(payload.new.total_score || 0);
        setEvaluationProgress(100);
      }
    }
  });

  const setupRealtimeSubscriptions = () => {
    // Subscriptions now handled by useStableRealtime hooks above
    return () => {
      // Cleanup handled by useStableRealtime
    };
  };
  };

  const updateProgress = async () => {
    try {
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select(`
          score,
          submissions!inner (instance_id)
        `)
        .eq('submissions.instance_id', instanceId);

      if (evaluations) {
        const currentScore = evaluations.reduce((sum, e) => sum + (e.score || 0), 0);
        const questionsEvaluated = evaluations.length;
        const totalQuestions = assessment.questions?.length || 1;
        
        setTotalScore(currentScore);
        setEvaluatedQuestions(questionsEvaluated);
        setEvaluationProgress((questionsEvaluated / totalQuestions) * 100);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const goToResults = () => {
    // For public assessments, show results inline
    window.location.reload();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <FileText className="w-4 h-4" />;
      case 'coding': return <Code className="w-4 h-4" />;
      case 'subjective': return <MessageSquare className="w-4 h-4" />;
      case 'file_upload': return <Upload className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Evaluating Your Assessment
                </CardTitle>
                <p className="text-muted-foreground">
                  {assessment.title} • Please wait while we process your responses
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>Time elapsed: {formatTime(timeElapsed)}</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(evaluationProgress)}% Complete
              </span>
            </div>
            <Progress value={evaluationProgress} className="w-full" />
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalScore}</div>
                <div className="text-sm text-muted-foreground">Points Scored</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{maxScore}</div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{evaluatedQuestions}</div>
                <div className="text-sm text-muted-foreground">Questions Done</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Types Info */}
        <Card>
          <CardHeader>
            <CardTitle>What's Being Evaluated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assessment.questions?.map((question: any, index: number) => (
                <div key={question.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getQuestionTypeIcon(question.question_type)}
                  <div className="flex-1">
                    <div className="font-medium">Question {index + 1}</div>
                    <div className="text-sm text-muted-foreground">
                      {question.question_type.toUpperCase()} • {question.points} pts
                    </div>
                  </div>
                  <Badge variant="outline">
                    {index < evaluatedQuestions ? 'Done' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completion Message */}
        {isComplete ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="text-center p-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Evaluation Complete!</h3>
              <p className="text-muted-foreground mb-4">
                Your assessment has been fully evaluated. You can now view your detailed results.
              </p>
              <Button onClick={goToResults}>
                <ArrowRight className="w-4 h-4 mr-2" />
                View Results
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <strong>Evaluation in progress...</strong> Multiple-choice questions are evaluated instantly, 
              while coding and subjective questions use AI evaluation which may take 30-60 seconds per question.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default PublicAssessmentEvaluation;