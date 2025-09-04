import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import AccessibilityControls from './AccessibilityControls';
import TTSButton from './TTSButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle, 
  Save,
  Eye,
  Brain,
  Flag,
  BookOpen,
  Maximize2,
  Minimize2,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CodingQuestion from './questions/CodingQuestion';
import EnhancedCodingQuestion from './questions/EnhancedCodingQuestion';
import MCQQuestion from './questions/MCQQuestion';
import SubjectiveQuestion from './questions/SubjectiveQuestion';
import FileUploadQuestion from './questions/FileUploadQuestion';
import AudioQuestion from './questions/AudioQuestion';
import RealTimeEvaluationPanel from './RealTimeEvaluationPanel';

interface Question {
  id: string;
  title: string;
  question_text: string;
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
  started_at: string;
  time_remaining_seconds: number;
  current_question_index: number;
  status: 'in_progress' | 'submitted' | 'evaluated';
  flags?: string[];
}

interface EnhancedAssessmentTakingProps {
  assessmentId: string;
}

const EnhancedAssessmentTaking: React.FC<EnhancedAssessmentTakingProps> = ({ 
  assessmentId 
}) => {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [instance, setInstance] = useState<AssessmentInstance | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEvaluationPanel, setShowEvaluationPanel] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [showAccessibilityControls, setShowAccessibilityControls] = useState(false);
  
  // Use ref to track pending saves to prevent race conditions
  const pendingSavesRef = useRef(new Set<string>());
  // Mock participant ID for now
  const mockParticipantId = '00000000-0000-0000-0000-000000000002';

  useEffect(() => {
    initializeAssessment();
  }, [assessmentId]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setInterval(autoSave, 30000); // Auto-save every 30 seconds
    return () => clearInterval(autoSaveTimer);
  }, [answers, instance]);

  // Timer functionality
  useEffect(() => {
    if (timeRemaining > 0 && instance?.status === 'in_progress') {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            handleAutoSubmit();
          }
          if (newTime <= 300 && newTime % 60 === 0) { // Warning every minute in last 5 minutes
            toast({
              title: "Time Warning",
              description: `${Math.floor(newTime / 60)} minutes remaining!`,
              variant: "destructive"
            });
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, instance?.status]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            autoSave();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            navigateToQuestion(currentQuestionIndex - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            navigateToQuestion(currentQuestionIndex + 1);
            break;
          case 'f':
            e.preventDefault();
            toggleFlag();
            break;
        }
      }
      
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestionIndex, assessment]);

  const initializeAssessment = async () => {
    try {
      // Fetch assessment with questions
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          instructions,
          duration_minutes,
          questions(
            id,
            title,
            question_text,
            question_type,
            difficulty,
            points,
            order_index,
            config
          )
        `)
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;

      const sortedQuestions = assessmentData.questions.sort((a, b) => a.order_index - b.order_index);
      setAssessment({ ...assessmentData, questions: sortedQuestions });

      // Check for existing instance or create new one
      const { data: existingInstance, error: instanceError } = await supabase
        .from('assessment_instances')
        .select('id, started_at, time_remaining_seconds, current_question_index, status')
        .eq('assessment_id', assessmentId)
        .eq('participant_id', mockParticipantId)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (instanceError && instanceError.code !== 'PGRST116') throw instanceError;

      if (existingInstance) {
        setInstance({ ...existingInstance, flags: [] });
        setCurrentQuestionIndex(existingInstance.current_question_index || 0);
        setTimeRemaining(existingInstance.time_remaining_seconds || assessmentData.duration_minutes * 60);
        setFlaggedQuestions(new Set());
        
        // Load existing submissions
        const { data: submissions } = await supabase
          .from('submissions')
          .select('question_id, answer')
          .eq('instance_id', existingInstance.id);

        if (submissions) {
          const answerMap = submissions.reduce((acc, sub) => {
            acc[sub.question_id] = sub.answer;
            return acc;
          }, {} as Record<string, any>);
          setAnswers(answerMap);
        }
      } else {
        // Create new instance
        const { data: newInstance, error: createError } = await supabase
          .from('assessment_instances')
          .insert({
            assessment_id: assessmentId,
            participant_id: mockParticipantId,
            time_remaining_seconds: assessmentData.duration_minutes * 60,
            current_question_index: 0
          })
          .select()
          .single();

        if (createError) throw createError;

        setInstance({ ...newInstance, flags: [] });
        setTimeRemaining(assessmentData.duration_minutes * 60);
      }
    } catch (error) {
      console.error('Error initializing assessment:', error);
      toast({
        title: "Error loading assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    if (!instance || autoSaveStatus === 'saving') return;

    setAutoSaveStatus('saving');
    try {
      // Update instance progress
      await supabase
        .from('assessment_instances')
        .update({
          current_question_index: currentQuestionIndex,
          time_remaining_seconds: timeRemaining
        })
        .eq('id', instance.id);

      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
    }
  };

  const saveAnswer = useCallback(async (questionId: string, answer: any) => {
    if (!instance) return;

    // Prevent multiple rapid saves for the same question
    const saveKey = `${instance.id}-${questionId}`;
    if (pendingSavesRef.current.has(saveKey)) {
      return;
    }

    pendingSavesRef.current.add(saveKey);

    try {
      const { error } = await supabase
        .from('submissions')
        .upsert({
          instance_id: instance.id,
          question_id: questionId,
          answer
        }, {
          onConflict: 'instance_id,question_id'
        });

      if (error) throw error;

      setAnswers(prev => ({ ...prev, [questionId]: answer }));
      
      // Show evaluation panel for coding questions
      if (assessment?.questions.find(q => q.id === questionId)?.question_type === 'coding' && answer.analysis) {
        setShowEvaluationPanel(true);
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      toast({
        title: "Error saving answer",
        description: "Your answer may not have been saved.",
        variant: "destructive"
      });
    } finally {
      // Remove from pending saves after a short delay
      setTimeout(() => {
        pendingSavesRef.current.delete(saveKey);
      }, 1000);
    }
  }, [instance, assessment, toast]);

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < (assessment?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const toggleFlag = () => {
    if (!assessment) return;
    
    const questionId = assessment.questions[currentQuestionIndex].id;
    setFlaggedQuestions(prev => {
      const newFlags = new Set(prev);
      if (newFlags.has(questionId)) {
        newFlags.delete(questionId);
        toast({ title: "Question unflagged" });
      } else {
        newFlags.add(questionId);
        toast({ title: "Question flagged for review" });
      }
      return newFlags;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleAutoSubmit = async () => {
    await submitAssessment(true);
  };

  const submitAssessment = async (isAutoSubmit = false) => {
    if (!instance || !assessment) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('assessment_instances')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', instance.id);

      if (error) throw error;

      toast({
        title: isAutoSubmit ? "Assessment auto-submitted" : "Assessment submitted successfully!",
        description: isAutoSubmit ? "Time has expired." : "Your responses have been saved."
      });

      setInstance(prev => prev ? { ...prev, status: 'submitted' } : null);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Error submitting assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
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

    const questionProps = {
      question,
      answer,
      onAnswerChange: (answer: any) => saveAnswer(question.id, answer),
      disabled: instance?.status === 'submitted'
    };

    switch (question.question_type) {
      case 'coding':
        return <EnhancedCodingQuestion {...questionProps} />;
      case 'mcq':
        return <MCQQuestion {...questionProps} />;
      case 'subjective':
        return <SubjectiveQuestion {...questionProps} />;
      case 'file_upload':
        return <FileUploadQuestion {...questionProps} />;
      case 'audio':
        return <AudioQuestion {...questionProps} />;
      default:
        return <div>Unknown question type</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment || !instance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Assessment not found</h3>
            <p className="text-muted-foreground">This assessment may have been removed or you may not have access to it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === assessment.questions.length - 1;
  const isTimeWarning = timeRemaining <= 300; // 5 minutes
  const isCodingQuestion = currentQuestion?.question_type === 'coding';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-semibold">{assessment.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {assessment.questions.length}
                </p>
              </div>
              <TTSButton text={assessment.title} />
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto-save status */}
              <div className="flex items-center gap-2 text-sm">
                {autoSaveStatus === 'saving' && (
                  <>
                    <Save className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <Save className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Saved</span>
                  </>
                )}
                {autoSaveStatus === 'error' && (
                  <>
                    <Save className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Save failed</span>
                  </>
                )}
              </div>

              {/* Timer */}
              <div className={`flex items-center gap-2 ${isTimeWarning ? 'text-destructive' : ''}`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono text-sm">{formatTime(timeRemaining)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAccessibilityControls(!showAccessibilityControls)}
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFlag}
                  disabled={instance.status === 'submitted'}
                  className={flaggedQuestions.has(currentQuestion.id) ? 'text-yellow-600' : ''}
                >
                  <Flag className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>

                {isCodingQuestion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEvaluationPanel(!showEvaluationPanel)}
                  >
                    <Brain className="w-4 h-4" />
                  </Button>
                )}

                {instance.status === 'in_progress' && (
                  <Button
                    onClick={() => submitAssessment()}
                    disabled={submitting}
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Accessibility Controls */}
        {showAccessibilityControls && (
          <div className="mb-6">
            <AccessibilityControls 
              isOpen={showAccessibilityControls}
              onToggle={() => setShowAccessibilityControls(!showAccessibilityControls)}
            />
          </div>
        )}

        <div className={`grid gap-6 ${isCodingQuestion && showEvaluationPanel ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Question Area */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {currentQuestion.title}
                      {flaggedQuestions.has(currentQuestion.id) && (
                        <Flag className="w-4 h-4 text-yellow-600" />
                      )}
                    </CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{currentQuestion.question_type}</Badge>
                      <Badge variant="outline">{currentQuestion.difficulty}</Badge>
                      <Badge variant="outline">{currentQuestion.points} pts</Badge>
                    </div>
                  </div>
                  <TTSButton text={currentQuestion.title} />
                </div>
                {currentQuestion.question_text && (
                  <div className="flex items-start justify-between mt-2">
                    <p className="text-muted-foreground">{currentQuestion.question_text}</p>
                    <TTSButton text={currentQuestion.question_text} />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {renderQuestion()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0 || instance.status === 'submitted'}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {assessment.questions.map((question, index) => (
                  <Button
                    key={index}
                    variant={
                      index === currentQuestionIndex 
                        ? "default" 
                        : answers[question.id] 
                          ? "secondary" 
                          : "outline"
                    }
                    size="sm"
                    onClick={() => navigateToQuestion(index)}
                    disabled={instance.status === 'submitted'}
                    className="w-10 h-10 p-0 relative"
                  >
                    {index + 1}
                    {flaggedQuestions.has(question.id) && (
                      <Flag className="w-2 h-2 absolute -top-1 -right-1 text-yellow-600" />
                    )}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                disabled={isLastQuestion || instance.status === 'submitted'}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* AI Evaluation Panel (for coding questions) */}
          {isCodingQuestion && showEvaluationPanel && (
            <div className="lg:sticky lg:top-24 lg:h-fit">
              <RealTimeEvaluationPanel
                data={answers[currentQuestion.id] || {}}
                question={currentQuestion}
                isLoading={false}
              />
            </div>
          )}
        </div>

        {/* Submission Status */}
        {instance.status === 'submitted' && (
          <Card className="mt-6 border-green-200 bg-green-50">
            <CardContent className="text-center p-6">
              <div className="text-green-600 mb-2">
                <Send className="w-8 h-8 mx-auto mb-2" />
                <h3 className="text-lg font-medium">Assessment Submitted</h3>
                <p>Your responses have been saved successfully.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-card p-3 rounded border shadow-sm">
        <div className="space-y-1">
          <div><kbd>Ctrl+S</kbd> Save</div>
          <div><kbd>Ctrl+←/→</kbd> Navigate</div>
          <div><kbd>Ctrl+F</kbd> Flag</div>
          <div><kbd>F11</kbd> Fullscreen</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAssessmentTaking;