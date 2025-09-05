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

// Import question components
import MCQQuestion from './questions/MCQQuestion';
import SubjectiveQuestion from './questions/SubjectiveQuestion';
import CodingQuestion from './questions/CodingQuestion';
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
}

const PublicAssessmentTaking: React.FC<PublicAssessmentTakingProps> = ({
  assessmentId,
  instance: initialInstance,
  onSubmission,
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

  // Initialize assessment and load existing answers
  useEffect(() => {
    fetchAssessmentData();
    loadExistingAnswers();
  }, [assessmentId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          submitAssessment(true); // Auto-submit when time runs out
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Auto-save effect
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      autoSave();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [answers, currentQuestionIndex, timeRemaining]);

  const fetchAssessmentData = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id, title, description, instructions, duration_minutes,
          questions (*)
        `)
        .eq('id', assessmentId)
        .single();

      if (error) {
        console.error('Error fetching assessment:', error);
        toast({
          title: "Error",
          description: "Failed to load assessment data.",
          variant: "destructive",
        });
        return;
      }

      // Sort questions by order_index
      const sortedQuestions = data.questions?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
      setAssessment({ ...data, questions: sortedQuestions });
    } catch (err) {
      console.error('Error:', err);
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

  const autoSave = useCallback(async () => {
    if (Object.keys(answers).length === 0) return;

    await saveProgress();
  }, [answers, currentQuestionIndex, timeRemaining]);

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

      // Save to database with upsert
      const { error } = await supabase
        .from('submissions')
        .upsert({
          instance_id: instance.id,
          question_id: questionId,
          answer: answer,
        }, {
          onConflict: 'instance_id,question_id'
        });

      if (error) {
        console.error('Error saving answer:', error);
        toast({
          title: "Save Error",
          description: "Failed to save your answer. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const navigateToQuestion = (index: number) => {
    if (!assessment || index < 0 || index >= assessment.questions.length) return;
    setCurrentQuestionIndex(index);
    saveProgress();
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

  const submitAssessment = async (isAutoSubmit = false) => {
    try {
      setSubmitting(true);

      // Update instance status to submitted
      const { data: updatedInstance, error: updateError } = await supabase
        .from('assessment_instances')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          time_remaining_seconds: timeRemaining,
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

      toast({
        title: "Assessment Submitted",
        description: isAutoSubmit 
          ? "Time expired. Your assessment has been automatically submitted."
          : "Your assessment has been submitted successfully.",
      });

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

    // Create a compatible question object that matches the expected interfaces
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
        return <CodingQuestion {...questionProps} />;
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
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Assessment not found</p>
      </div>
    );
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
              
              {/* Save Status */}
              {saving && <Badge variant="outline">Saving...</Badge>}
              {lastSaveTime && !saving && (
                <Badge variant="outline" className="text-green-600">
                  <Save className="h-3 w-3 mr-1" />
                  Saved
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

            {/* Low Time Warning */}
            {timeRemaining <= 300 && timeRemaining > 0 && (
              <Alert className="mt-4 border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: Only {Math.ceil(timeRemaining / 60)} minutes remaining!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAssessmentTaking;