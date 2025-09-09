import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Timer, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Save,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProgressPersistence } from '@/hooks/useProgressPersistence';
import { useFrontendMCQEvaluation } from '@/hooks/useFrontendMCQEvaluation';
import InstantMCQResults from './InstantMCQResults';

// Import question components
import MCQQuestion from './questions/MCQQuestion';
import SubjectiveQuestion from './questions/SubjectiveQuestion';
import EnhancedCodingQuestion from './questions/EnhancedCodingQuestion';
import FileUploadQuestion from './questions/FileUploadQuestion';
import AudioQuestion from './questions/AudioQuestion';

interface Question {
  id: string;
  title: string;
  question_text?: string;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  difficulty: string;
  points: number;
  order_index: number;
  config: any;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  questions: Question[];
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

interface PublicAssessmentTakingProps {
  assessmentId: string;
  instance: AssessmentInstance;
  onSubmission: (instance: AssessmentInstance) => void;
  onProctoringStop?: () => void;
  proctoringData?: {
    violations: any[];
    summary: {
      integrity_score: number;
      violations_count: number;
      technical_issues: string[];
    };
  };
  showTwoColumnLayout?: boolean; // For proctoring-enabled results
}

const PublicAssessmentTaking: React.FC<PublicAssessmentTakingProps> = ({
  assessmentId,
  instance: initialInstance,
  onSubmission,
  onProctoringStop,
  proctoringData,
  showTwoColumnLayout = false
}) => {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [instance, setInstance] = useState<AssessmentInstance>(initialInstance);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialInstance.current_question_index);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(initialInstance.time_remaining_seconds || 0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstantResults, setShowInstantResults] = useState(false);
  const [instantResults, setInstantResults] = useState<any>(null);

  // Frontend MCQ evaluation
  const { evaluateMCQAssessment, saveBatchResults, evaluating } = useFrontendMCQEvaluation();

  // Enhanced progress persistence
  const {
    saveAnswer: persistAnswer,
    navigateToQuestion: persistNavigate,
    updateTimeRemaining: persistTime,
    forceSave,
    canResume,
    resumeFromSaved,
    saving: persistenceSaving,
    lastSaved
  } = useProgressPersistence({
    instanceId: instance.id,
    enabled: true,
    autoSaveInterval: 30000
  });

  // Initialize assessment and load existing answers
  useEffect(() => {
    initializeAssessment();
  }, [assessmentId]);

  // Enhanced timer effect with persistence
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleAutoSubmit();
          return 0;
        }
        
        // Persist time every 10 seconds
        if (newTime % 10 === 0) {
          persistTime(newTime);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, persistTime]);

  // Auto-save effect
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveProgress();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [answers, currentQuestionIndex, timeRemaining]);

  // Window close auto-submission
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Auto-submit if assessment is in progress and has answers
      if (instance?.status === 'in_progress' && Object.keys(answers).length > 0) {
        // Use sendBeacon for reliable submission during page unload
        const submissionData = {
          instanceId: instance.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          time_remaining_seconds: timeRemaining,
          duration_taken_seconds: (assessment?.duration_minutes || 60) * 60 - timeRemaining,
        };

        navigator.sendBeacon(
          `https://axdwgxtukqqzupboojmx.supabase.co/functions/v1/auto-submit-assessment`,
          JSON.stringify(submissionData)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [instance, answers, timeRemaining, assessment]);

  const initializeAssessment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch assessment data
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, title, description, instructions, duration_minutes')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        console.error('Error fetching assessment:', assessmentError);
        setError('Failed to load assessment data');
        return;
      }

      // Fetch questions separately
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('order_index');

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        setError('Failed to load assessment questions');
        return;
      }

      // Sort questions by order_index (already ordered by database query)
      const sortedQuestions = questionsData || [];
      setAssessment({ ...assessmentData, questions: sortedQuestions });

      // Load existing answers and check for resume capability
      await loadExistingAnswers();
      
      // Check if we can resume from a previous session
      if (canResume()) {
        const savedState = resumeFromSaved();
        setCurrentQuestionIndex(savedState.currentQuestionIndex);
        setTimeRemaining(savedState.timeRemainingSeconds);
        setAnswers(savedState.answers);
        
        toast({
          title: "Session Resumed",
          description: "Your previous progress has been restored.",
        });
      }

    } catch (err: any) {
      console.error('Error initializing assessment:', err);
      setError('Failed to initialize assessment');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAnswers = async () => {
    try {
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('question_id, answer')
        .eq('instance_id', instance.id);

      if (error) {
        console.error('Error loading existing answers:', error);
        return;
      }

      const existingAnswers: Record<string, any> = {};
      submissions?.forEach((submission: any) => {
        existingAnswers[submission.question_id] = submission.answer;
      });

      setAnswers(existingAnswers);
    } catch (err) {
      console.error('Error loading answers:', err);
    }
  };

  const saveProgress = async () => {
    try {
      setSaving(true);

      // Update instance with current progress
      const { error: instanceError } = await supabase
        .from('assessment_instances')
        .update({
          current_question_index: currentQuestionIndex,
          time_remaining_seconds: timeRemaining,
        })
        .eq('id', instance.id);

      if (instanceError) {
        console.error('Error updating instance:', instanceError);
        return;
      }

      setLastSaveTime(new Date());
      
    } catch (err) {
      console.error('Error saving progress:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveAnswer = async (questionId: string, answer: any) => {
    try {
      // Update local state immediately
      setAnswers(prev => ({ ...prev, [questionId]: answer }));

      // Use enhanced persistence
      await persistAnswer(questionId, answer);
      setLastSaveTime(new Date());

    } catch (err) {
      console.error('Error saving answer:', err);
      toast({
        title: "Save Error",
        description: "Failed to save your answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navigateToQuestion = async (index: number) => {
    if (!assessment || index < 0 || index >= assessment.questions.length) return;
    
    // Save current answer before navigating
    const currentQuestion = assessment.questions[currentQuestionIndex];
    if (currentQuestion && answers[currentQuestion.id] !== undefined) {
      await saveAnswer(currentQuestion.id, answers[currentQuestion.id]);
    }
    
    setCurrentQuestionIndex(index);
    await persistNavigate(index);
  };

  const toggleFlag = () => {
    if (!assessment) return;
    
    const currentQuestion = assessment.questions[currentQuestionIndex];
    const newFlagged = new Set(flaggedQuestions);
    
    if (newFlagged.has(currentQuestion.id)) {
      newFlagged.delete(currentQuestion.id);
    } else {
      newFlagged.add(currentQuestion.id);
    }
    
    setFlaggedQuestions(newFlagged);
  };

  const handleAutoSubmit = () => {
    submitAssessment(true);
  };

  const submitAssessment = async (isAutoSubmit = false) => {
    try {
      setSubmitting(true);
      
      // Signal to stop proctoring
      onProctoringStop?.();

      // Calculate duration taken (total time minus remaining time)
      const assessmentDuration = assessment?.duration_minutes || 60;
      const durationTaken = (assessmentDuration * 60) - timeRemaining;

      // Update instance status to submitted
      const { data: updatedInstance, error: updateError } = await supabase
        .from('assessment_instances')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          time_remaining_seconds: timeRemaining,
          duration_taken_seconds: durationTaken,
        })
        .eq('id', instance.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error submitting assessment:', updateError);
        toast({
          title: "Submission Error",
          description: "Failed to submit assessment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if this is a pure MCQ assessment
      const isMCQOnly = assessment?.questions?.every(q => q.question_type === 'mcq');
      console.log('Assessment submitted, isMCQOnly:', isMCQOnly, 'Questions:', assessment?.questions?.map(q => q.question_type));
      
      if (isMCQOnly) {
        // For MCQ-only assessments, calculate score instantly in frontend
        try {
          const evaluation = await evaluateMCQAssessment(assessment, answers, instance);
          
          if (evaluation) {
            // Update the duration taken in the evaluation
            const actualDurationTaken = (assessment?.duration_minutes || 60) * 60 - timeRemaining;
            
            // Save everything to database in batch
            await saveBatchResults(evaluation, {
              ...instance,
              duration_taken_seconds: actualDurationTaken
            }, answers);
            
            // Show instant results
            setInstantResults({
              evaluation,
              durationTaken: actualDurationTaken,
              shareUrl: `/public/assessment/${instance.share_token}/results?email=${encodeURIComponent(instance.participant_email)}`
            });
            setShowInstantResults(true);
            
            toast({
              title: "Assessment Submitted",
              description: "Your assessment has been evaluated instantly!",
            });
          } else {
            throw new Error('Failed to evaluate assessment');
          }
          
        } catch (evalErr) {
          console.error('Failed to evaluate MCQ assessment:', evalErr);
          toast({
            title: "Evaluation Error",
            description: "Assessment submitted but evaluation failed. Please contact support.",
            variant: "destructive",
          });
        }
      } else {
        // For mixed or non-MCQ assessments, use the evaluation progress flow
        try {
          const { data: evaluationResult, error: evalError } = await supabase.functions.invoke('auto-evaluate-assessment', {
            body: { instanceId: instance.id }
          });

          if (evalError) {
            console.error('Error triggering evaluation:', evalError);
          } else {
            console.log('Evaluation triggered successfully:', evaluationResult);
          }
        } catch (evalErr) {
          console.error('Failed to trigger evaluation:', evalErr);
        }

        toast({
          title: "Assessment Submitted",
          description: isAutoSubmit 
            ? "Time expired. Your assessment has been automatically submitted and is being evaluated."
            : "Your assessment has been submitted successfully and is being evaluated.",
        });

        // Redirect to evaluation progress page for mixed assessments
        console.log('Redirecting to evaluation progress page');
        window.location.href = `/assessment/${instance.assessment_id}/evaluation/${instance.id}`;
      }
      
      onSubmission(updatedInstance);

    } catch (err) {
      console.error('Error submitting assessment:', err);
      toast({
        title: "Submission Error", 
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const evaluateMCQInstantly = async () => {
    if (!assessment) return;

    // Get all submissions for this instance
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, question_id, answer')
      .eq('instance_id', instance.id);

    if (submissionsError) {
      throw new Error('Failed to fetch submissions for evaluation');
    }

    // Create a map of submissions by question ID
    const submissionMap = new Map();
    submissions?.forEach(submission => {
      submissionMap.set(submission.question_id, submission.answer);
    });

    let totalScore = 0;
    let maxPossibleScore = 0;

    // Evaluate each MCQ question
    for (const question of assessment.questions) {
      if (question.question_type !== 'mcq') continue;

      maxPossibleScore += question.points || 0;
      const submission = submissionMap.get(question.id);
      
      if (!submission || !question.config?.options) continue;

      // Get selected options from submission
      const selectedOptions = submission.selectedOptions || [];
      
      // Find correct options
      const correctOptions = question.config.options
        .filter((option: any) => option.isCorrect)
        .map((option: any) => option.id);

      // Check if answer is correct (exact match)
      const isCorrect = selectedOptions.length === correctOptions.length &&
                       selectedOptions.every((selected: any) => correctOptions.includes(selected)) &&
                       correctOptions.every((correct: any) => selectedOptions.includes(correct));

      const score = isCorrect ? (question.points || 0) : 0;
      totalScore += score;

      // Insert evaluation record
      const submissionRecord = submissions?.find((s: any) => s.question_id === question.id);
      if (submissionRecord) {
        await supabase
          .from('evaluations')
          .insert({
            submission_id: submissionRecord.id,
            score: score,
            max_score: question.points || 0,
            integrity_score: 100, // Assume no proctoring issues for instant evaluation
            evaluator_type: 'automatic',
            ai_feedback: {
              question_type: 'mcq',
              evaluation_method: 'instant_automatic',
              timestamp: new Date().toISOString()
            }
          });
      }
    }

    // Calculate final percentage
    const finalScore = totalScore;
    const percentage = maxPossibleScore > 0 ? Math.round((finalScore / maxPossibleScore) * 100) : 0;

    // Update the assessment instance with final scores
    await supabase
      .from('assessment_instances')
      .update({
        total_score: finalScore,
        max_possible_score: maxPossibleScore,
        integrity_score: 100,
        status: 'evaluated',
        evaluation_status: 'completed',
      })
      .eq('id', instance.id);

    console.log(`Instant MCQ evaluation completed: ${finalScore}/${maxPossibleScore} (${percentage}%)`);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = () => {
    if (!assessment || !assessment.questions[currentQuestionIndex]) return null;

    const question = assessment.questions[currentQuestionIndex];
    const answer = answers[question.id];

    const compatibleQuestion = {
      ...question,
      question_text: question.question_text || question.title || '',
    };

    const questionProps = {
      question: compatibleQuestion,
      answer,
      onAnswerChange: (newAnswer: any) => saveAnswer(question.id, newAnswer),
      disabled: submitting,
    };

    switch (question.question_type) {
      case 'mcq':
        return <MCQQuestion {...questionProps} />;
      case 'subjective':
        return <SubjectiveQuestion {...questionProps} />;
      case 'coding':
        return <EnhancedCodingQuestion {...questionProps} />;
      case 'file_upload':
        return <FileUploadQuestion {...questionProps} />;
      case 'audio':
        return <AudioQuestion {...questionProps} />;
      default:
        return <div>Unsupported question type: {question.question_type}</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || 'Assessment could not be loaded'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show instant results if available
  if (showInstantResults && instantResults) {
    if (showTwoColumnLayout && proctoringData) {
      // Return just the main results content for two-column layout
      return (
        <InstantMCQResults
          evaluation={instantResults.evaluation}
          assessment={assessment}
          instance={instance}
          durationTaken={instantResults.durationTaken}
          shareUrl={instantResults.shareUrl}
          onViewFullResults={() => {
            if (instantResults.shareUrl) {
              window.open(instantResults.shareUrl, '_blank');
            }
          }}
          onRetakeAssessment={() => {
            // Reset state to start a new attempt
            setCurrentQuestionIndex(0);
            setAnswers({});
            setInstantResults(null);
            setTimeRemaining(assessment?.duration_minutes ? assessment.duration_minutes * 60 : 0);
          }}
        />
      );
    } else {
      // Single column layout (no proctoring or proctoring disabled)
      return (
        <InstantMCQResults
          evaluation={instantResults.evaluation}
          assessment={assessment}
          instance={instance}
          durationTaken={instantResults.durationTaken}
          shareUrl={instantResults.shareUrl}
          proctoringData={proctoringData}
          onViewFullResults={() => {
            if (instantResults.shareUrl) {
              window.open(instantResults.shareUrl, '_blank');
            }
          }}
          onRetakeAssessment={() => {
            // Reset state to start a new attempt
            setCurrentQuestionIndex(0);
            setAnswers({});
            setInstantResults(null);
            setTimeRemaining(assessment?.duration_minutes ? assessment.duration_minutes * 60 : 0);
          }}
        />
      );
    }
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{assessment.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {assessment.questions.length}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                timeRemaining <= 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(timeRemaining)}</span>
              </div>
              
              {/* Enhanced Save Status */}
              {(saving || persistenceSaving) && <Badge variant="outline">Saving...</Badge>}
              {(lastSaveTime || lastSaved) && !saving && !persistenceSaving && (
                <Badge variant="outline" className="text-green-600">
                  <Save className="h-3 w-3 mr-1" />
                  Saved {lastSaved ? new Date(lastSaved).toLocaleTimeString() : ''}
                </Badge>
              )}
              
              {/* Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlag}
                className={flaggedQuestions.has(currentQuestion.id) ? 'bg-yellow-100' : ''}
              >
                <Flag className="h-4 w-4 mr-1" />
                {flaggedQuestions.has(currentQuestion.id) ? 'Unflag' : 'Flag'}
              </Button>
              
              <Button onClick={() => submitAssessment()} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            </div>
          </div>
          
          {/* Progress */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Low time warning */}
      {timeRemaining <= 300 && timeRemaining > 0 && (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Only {Math.floor(timeRemaining / 60)} minutes and {timeRemaining % 60} seconds remaining!
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                  {assessment.questions.map((question, index) => {
                    const isAnswered = answers[question.id] !== undefined;
                    const isFlagged = flaggedQuestions.has(question.id);
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <Button
                        key={question.id}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        onClick={() => navigateToQuestion(index)}
                        className={`relative ${isFlagged ? 'ring-2 ring-yellow-400' : ''}`}
                      >
                        {index + 1}
                        {isAnswered && (
                          <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-white rounded-full" />
                        )}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -left-1 h-3 w-3 text-yellow-600 bg-white rounded-full" />
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Answered ({Object.keys(answers).length})
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag className="h-3 w-3 text-yellow-600" />
                    Flagged ({flaggedQuestions.size})
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Question {currentQuestionIndex + 1}
                    <Badge variant="secondary" className="ml-2">
                      {currentQuestion.points} points
                    </Badge>
                  </CardTitle>
                  <Badge variant="outline">{currentQuestion.difficulty}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {renderQuestion()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === assessment.questions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAssessmentTaking;