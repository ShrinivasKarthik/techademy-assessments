import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Plus, Eye, Save, Trash2, Edit, Library, Shield, Camera, Monitor, X, Mic, CheckCircle, ArrowLeft, BookOpen } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import EnhancedQuestionBuilders from './EnhancedQuestionBuilders';
import EnhancedAIGenerator from "./EnhancedAIGenerator";
import AssessmentQualityAssurance from './AssessmentQualityAssurance';
import QuestionBrowser from "./QuestionBrowser";
import { Question as QuestionBankQuestion } from "@/hooks/useQuestionBank";

type QuestionType = 'project_based' | 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio' | 'interview';
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface Question {
  id?: string;
  title: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
  config: any;
}

interface ProctoringConfig {
  cameraRequired: boolean;
  microphoneRequired: boolean;
  screenSharing: boolean;
  tabSwitchDetection: boolean;
  fullscreenRequired: boolean;
  faceDetection: boolean;
  voiceAnalysis: boolean;
  environmentCheck: boolean;
  browserLockdown: boolean;
  autoStart: boolean;
  requireProctorApproval: boolean;
}

interface Assessment {
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  max_attempts: number;
  status: 'draft' | 'published';
  proctoring_enabled: boolean;
  proctoring_config: ProctoringConfig;
  questions: Question[];
}

const EditAssessment = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id: assessmentId } = useParams<{ id: string }>();
  
  const [assessment, setAssessment] = useState<Assessment>({
    title: '',
    description: '',
    instructions: '',
    duration_minutes: 60,
    max_attempts: 1,
    status: 'draft',
    proctoring_enabled: false,
    proctoring_config: {
      cameraRequired: true,
      microphoneRequired: true,
      screenSharing: false,
      tabSwitchDetection: true,
      fullscreenRequired: true,
      faceDetection: true,
      voiceAnalysis: false,
      environmentCheck: true,
      browserLockdown: true,
      autoStart: false,
      requireProctorApproval: false
    },
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    title: '',
    question_text: '',
    question_type: 'project_based',
    difficulty: 'intermediate',
    points: 10,
    order_index: 0,
      config: {
        language: 'javascript',
        supportedLanguages: ['javascript'],
        starterCode: '',
        testCases: [],
        hints: [],
        commonMistakes: [],
        optimizationTips: [],
        templates: []
      }
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showQuestionBrowser, setShowQuestionBrowser] = useState(false);
  const [showQualityAssurance, setShowQualityAssurance] = useState(false);
  const [loading, setLoading] = useState(true);

  const questionTypes = [
    { value: 'coding', label: 'Coding Challenge' },
    { value: 'mcq', label: 'Multiple Choice' },
    { value: 'subjective', label: 'Subjective' },
    { value: 'file_upload', label: 'File Upload' },
    { value: 'audio', label: 'Audio Response' }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    if (assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId]);

  const loadAssessment = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          questions!fk_questions_assessment(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Assessment not found",
          description: "The assessment you're trying to edit doesn't exist.",
          variant: "destructive"
        });
        navigate('/assessments');
        return;
      }

      const sortedQuestions = data.questions.sort((a, b) => a.order_index - b.order_index);
      
      setAssessment({
        title: data.title,
        description: data.description || '',
        instructions: data.instructions || '',
        duration_minutes: data.duration_minutes,
        max_attempts: data.max_attempts,
        status: data.status === 'archived' ? 'draft' : data.status,
        proctoring_enabled: data.proctoring_enabled,
        proctoring_config: {
          cameraRequired: (data.proctoring_config as any)?.cameraRequired ?? true,
          microphoneRequired: (data.proctoring_config as any)?.microphoneRequired ?? true,
          screenSharing: (data.proctoring_config as any)?.screenSharing ?? false,
          tabSwitchDetection: (data.proctoring_config as any)?.tabSwitchDetection ?? true,
          fullscreenRequired: (data.proctoring_config as any)?.fullscreenRequired ?? true,
          faceDetection: (data.proctoring_config as any)?.faceDetection ?? true,
          voiceAnalysis: (data.proctoring_config as any)?.voiceAnalysis ?? false,
          environmentCheck: (data.proctoring_config as any)?.environmentCheck ?? true,
          browserLockdown: (data.proctoring_config as any)?.browserLockdown ?? true,
          autoStart: (data.proctoring_config as any)?.autoStart ?? false,
          requireProctorApproval: (data.proctoring_config as any)?.requireProctorApproval ?? false
        },
        questions: sortedQuestions.map(q => ({
          id: q.id,
          title: q.title,
          question_text: q.question_text || '',
          question_type: q.question_type,
          difficulty: q.difficulty,
          points: q.points,
          order_index: q.order_index,
          config: q.config || {}
        }))
      });
    } catch (error) {
      console.error('Error loading assessment:', error);
      toast({
        title: "Error loading assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      ...currentQuestion,
      order_index: assessment.questions.length
    };
    
    setAssessment(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setCurrentQuestion({
      title: '',
      question_text: '',
      question_type: 'project_based',
      difficulty: 'intermediate',
      points: 10,
      order_index: 0,
        config: {
          language: 'javascript',
          supportedLanguages: ['javascript'],
          starterCode: '',
          testCases: [],
          hints: [],
          commonMistakes: [],
          optimizationTips: [],
          templates: []
        }
    });
    setShowQuestionForm(false);
  };

  const handleAIContentGenerated = (content: any) => {
    setCurrentQuestion(prev => ({
      ...prev,
      title: content.title,
      description: content.description,
      difficulty: content.difficulty,
      points: content.points,
      config: content.config
    }));
    setShowAIGenerator(false);
    setShowQuestionForm(true);
  };

  const addQuestionsFromBank = (bankQuestions: QuestionBankQuestion[]) => {
    const newQuestions: Question[] = bankQuestions.map((bankQ, index) => ({
      id: crypto.randomUUID(),
      title: bankQ.title,
      question_text: bankQ.question_text || '',
      question_type: bankQ.question_type,
      difficulty: bankQ.difficulty,
      points: bankQ.points,
      order_index: assessment.questions.length + index,
      config: bankQ.config || {},
    }));

    setAssessment(prev => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions]
    }));

    toast({
      title: "Questions Added",
      description: `${newQuestions.length} question(s) have been added to your assessment`,
    });
  };

  const removeQuestion = (index: number) => {
    setAssessment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateAssessment = async () => {
    if (!assessmentId) return;

    try {
      const { error: assessmentError } = await supabase
        .from('assessments')
        .update({
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          duration_minutes: assessment.duration_minutes,
          max_attempts: assessment.max_attempts,
          status: assessment.status,
          proctoring_enabled: assessment.proctoring_enabled,
          proctoring_config: assessment.proctoring_config as any,
        })
        .eq('id', assessmentId);

      if (assessmentError) throw assessmentError;

      // Delete existing questions and insert new ones
      await supabase
        .from('questions')
        .delete()
        .eq('assessment_id', assessmentId);

      if (assessment.questions.length > 0) {
        const questionsData = assessment.questions.map(q => ({
          assessment_id: assessmentId,
          title: q.title,
          question_text: q.question_text,
          question_type: q.question_type,
          difficulty: q.difficulty,
          points: q.points,
          order_index: q.order_index,
          config: q.config
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsData.map(q => ({ ...q, question_type: q.question_type as any })));

        if (questionsError) throw questionsError;
      }

      toast({
        title: "Assessment updated successfully!",
        description: `"${assessment.title}" has been updated.`
      });

      navigate(`/assessments/${assessmentId}/preview`);
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast({
        title: "Error updating assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/assessments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Assessment</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/assessments/${assessmentId}/preview`)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={updateAssessment} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Update Assessment
          </Button>
        </div>
      </div>

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={assessment.title}
                onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter assessment title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={assessment.duration_minutes}
                onChange={(e) => setAssessment(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={assessment.description}
              onChange={(e) => setAssessment(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the assessment purpose and scope"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={assessment.instructions}
              onChange={(e) => setAssessment(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Provide detailed instructions for participants"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attempts">Max Attempts</Label>
              <Input
                id="attempts"
                type="number"
                value={assessment.max_attempts}
                onChange={(e) => setAssessment(prev => ({ ...prev, max_attempts: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={assessment.status} onValueChange={(value: 'draft' | 'published') => setAssessment(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions ({assessment.questions.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowQuestionBrowser(true)}>
                <Library className="w-4 h-4 mr-2" />
                Browse Bank
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAIGenerator(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button size="sm" onClick={() => setShowQuestionForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment.questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessment.questions.map((question, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{question.question_type}</Badge>
                      <Badge variant="outline">{question.difficulty}</Badge>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>
                    <h4 className="font-medium">{question.title}</h4>
                    {question.question_text && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {question.question_text.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showQuestionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Question</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowQuestionForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="questionTitle">Question Title</Label>
                  <Input
                    id="questionTitle"
                    value={currentQuestion.title}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter question title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select value={currentQuestion.question_type} onValueChange={(value: QuestionType) => setCurrentQuestion(prev => ({ ...prev, question_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionDescription">Question Text</Label>
                <Textarea
                  id="questionDescription"
                  value={currentQuestion.question_text}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                  placeholder="What do you want to ask?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={currentQuestion.difficulty} onValueChange={(value: DifficultyLevel) => setCurrentQuestion(prev => ({ ...prev, difficulty: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowQuestionForm(false)}>
                  Cancel
                </Button>
                <Button onClick={addQuestion} disabled={!currentQuestion.title.trim()}>
                  Add Question
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAIGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Question Generator</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAIGenerator(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p>AI Generator component would go here</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showQuestionBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Question Bank</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowQuestionBrowser(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p>Question browser component would go here</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EditAssessment;