import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Save, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedQuestionBuilders from './EnhancedQuestionBuilders';

type QuestionType = 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface Question {
  id?: string;
  title: string;
  description: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
  config: any;
}

interface Assessment {
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  max_attempts: number;
  status: 'draft' | 'published';
  questions: Question[];
}

const CreateAssessment = () => {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment>({
    title: '',
    description: '',
    instructions: '',
    duration_minutes: 60,
    max_attempts: 1,
    status: 'draft',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    title: '',
    description: '',
    question_type: 'coding',
    difficulty: 'intermediate',
    points: 10,
    order_index: 0,
    config: {}
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);

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
      description: '',
      question_type: 'coding',
      difficulty: 'intermediate',
      points: 10,
      order_index: 0,
      config: {}
    });
    setShowQuestionForm(false);
  };

  const removeQuestion = (index: number) => {
    setAssessment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const saveAssessment = async () => {
    try {
      // Use mock creator ID for now
      const mockCreatorId = '00000000-0000-0000-0000-000000000001';
      
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          duration_minutes: assessment.duration_minutes,
          max_attempts: assessment.max_attempts,
          status: assessment.status,
          creator_id: mockCreatorId
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Insert questions
      if (assessment.questions.length > 0) {
        const questionsData = assessment.questions.map(q => ({
          assessment_id: assessmentData.id,
          title: q.title,
          description: q.description,
          question_type: q.question_type,
          difficulty: q.difficulty,
          points: q.points,
          order_index: q.order_index,
          config: q.config
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsData);

        if (questionsError) throw questionsError;
      }

      toast({
        title: "Assessment saved successfully!",
        description: `"${assessment.title}" has been created.`
      });

      // Reset form
      setAssessment({
        title: '',
        description: '',
        instructions: '',
        duration_minutes: 60,
        max_attempts: 1,
        status: 'draft',
        questions: []
      });

    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error saving assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Assessment</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={saveAssessment} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Assessment
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
            <Button onClick={() => setShowQuestionForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment.questions.map((question, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{question.title}</h4>
                  <p className="text-sm text-muted-foreground">{question.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{questionTypes.find(t => t.value === question.question_type)?.label}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="outline">{question.points} pts</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {assessment.questions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No questions added yet. Click "Add Question" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Form */}
      {showQuestionForm && (
        <Card>
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
              <Label htmlFor="questionDescription">Description</Label>
              <Textarea
                id="questionDescription"
                value={currentQuestion.description}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what the question is asking"
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

            {/* Question Configuration */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Question Configuration</Label>
              <EnhancedQuestionBuilders
                questionType={currentQuestion.question_type}
                config={currentQuestion.config}
                onConfigChange={(config) => setCurrentQuestion(prev => ({ ...prev, config }))}
                questionDescription={currentQuestion.description}
                difficulty={currentQuestion.difficulty}
              />
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
      )}
    </div>
  );
};

export default CreateAssessment;