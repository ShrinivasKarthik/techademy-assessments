import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Plus, Eye, Save, Trash2, Edit, Library, Shield, Camera, Monitor, X, Mic, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedQuestionBuilders from './EnhancedQuestionBuilders';
import EnhancedAIGenerator from "./EnhancedAIGenerator";
import AssessmentQualityAssurance from './AssessmentQualityAssurance';
import AssessmentQualityGates from './AssessmentQualityGates';
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
  live_monitoring_enabled: boolean;
  proctoring_config: ProctoringConfig;
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
    proctoring_enabled: false,
    live_monitoring_enabled: false,
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
    question_type: 'mcq',
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
  const [showQualityGates, setShowQualityGates] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

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
      question_text: '',
      question_type: 'mcq',
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

  const saveAssessment = async () => {
    try {
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          duration_minutes: assessment.duration_minutes,
          max_attempts: assessment.max_attempts,
          status: assessment.status,
          proctoring_enabled: assessment.proctoring_enabled,
          live_monitoring_enabled: assessment.live_monitoring_enabled,
          proctoring_config: assessment.proctoring_config as any,
          creator_id: null
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;
      
      setAssessmentId(assessmentData.id);

      if (assessment.questions.length > 0) {
        const questionsData = assessment.questions.map(q => ({
          assessment_id: assessmentData.id,
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
        title: "Assessment created successfully!",
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
        proctoring_enabled: false,
        live_monitoring_enabled: false,
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
          {assessmentId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowQualityGates(true)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Quality Check
            </Button>
          )}
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

      {/* Proctoring Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Proctoring & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="proctoring-enabled">Enable Proctoring</Label>
              <p className="text-sm text-muted-foreground">
                Activate live monitoring and security controls for this assessment
              </p>
            </div>
            <Switch
              id="proctoring-enabled"
              checked={assessment.proctoring_enabled}
              onCheckedChange={(checked) => setAssessment(prev => ({ ...prev, proctoring_enabled: checked }))}
            />
          </div>

          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="live-monitoring-enabled">Enable Live Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Allow administrators to monitor participants in real-time during assessments
              </p>
            </div>
            <Switch
              id="live-monitoring-enabled"
              checked={assessment.live_monitoring_enabled}
              onCheckedChange={(checked) => setAssessment(prev => ({ ...prev, live_monitoring_enabled: checked }))}
            />
          </div>

          {assessment.proctoring_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Video & Audio
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="camera-required">Camera Required</Label>
                      <Switch
                        id="camera-required"
                        checked={assessment.proctoring_config.cameraRequired}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, cameraRequired: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="microphone-required">Microphone Required</Label>
                      <Switch
                        id="microphone-required"
                        checked={assessment.proctoring_config.microphoneRequired}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, microphoneRequired: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="face-detection">Face Detection</Label>
                      <Switch
                        id="face-detection"
                        checked={assessment.proctoring_config.faceDetection}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, faceDetection: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="voice-analysis">Voice Analysis</Label>
                      <Switch
                        id="voice-analysis"
                        checked={assessment.proctoring_config.voiceAnalysis}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, voiceAnalysis: checked }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Browser & Environment
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fullscreen-required">Fullscreen Required</Label>
                      <Switch
                        id="fullscreen-required"
                        checked={assessment.proctoring_config.fullscreenRequired}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, fullscreenRequired: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tab-switch-detection">Tab Switch Detection</Label>
                      <Switch
                        id="tab-switch-detection"
                        checked={assessment.proctoring_config.tabSwitchDetection}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, tabSwitchDetection: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="browser-lockdown">Browser Lockdown</Label>
                      <Switch
                        id="browser-lockdown"
                        checked={assessment.proctoring_config.browserLockdown}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, browserLockdown: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="screen-sharing">Screen Sharing</Label>
                      <Switch
                        id="screen-sharing"
                        checked={assessment.proctoring_config.screenSharing}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, screenSharing: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="environment-check">Environment Check</Label>
                      <Switch
                        id="environment-check"
                        checked={assessment.proctoring_config.environmentCheck}
                        onCheckedChange={(checked) => setAssessment(prev => ({
                          ...prev,
                          proctoring_config: { ...prev.proctoring_config, environmentCheck: checked }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Advanced Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-start">Auto-start Proctoring</Label>
                    <Switch
                      id="auto-start"
                      checked={assessment.proctoring_config.autoStart}
                      onCheckedChange={(checked) => setAssessment(prev => ({
                        ...prev,
                        proctoring_config: { ...prev.proctoring_config, autoStart: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require-proctor-approval">Require Proctor Approval</Label>
                    <Switch
                      id="require-proctor-approval"
                      checked={assessment.proctoring_config.requireProctorApproval}
                      onCheckedChange={(checked) => setAssessment(prev => ({
                        ...prev,
                        proctoring_config: { ...prev.proctoring_config, requireProctorApproval: checked }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Questions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions ({assessment.questions.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQuestionBrowser(true)}
                size="sm"
              >
                <Library className="w-4 h-4 mr-2" />
                Add from Bank
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAIGenerator(true)} 
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button onClick={() => setShowQuestionForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment.questions.map((question, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{question.title}</h4>
                  <p className="text-sm text-muted-foreground">{question.question_text}</p>
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

      {/* Assessment Quality Assurance */}
      {assessment.questions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <CardTitle>Assessment Quality Analysis</CardTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowQualityAssurance(!showQualityAssurance)}
                size="sm"
              >
                {showQualityAssurance ? 'Hide Analysis' : 'Analyze Quality'}
              </Button>
            </div>
          </CardHeader>
          {showQualityAssurance && (
            <CardContent>
              <AssessmentQualityAssurance
                assessmentId="preview"
                questions={assessment.questions}
                onQualityImproved={() => {
                  toast({
                    title: "Quality Improvements Applied",
                    description: "Assessment quality has been enhanced based on AI recommendations.",
                  });
                }}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Question Browser Modal */}
      {showQuestionBrowser && (
        <QuestionBrowser
          isOpen={showQuestionBrowser}
          onClose={() => setShowQuestionBrowser(false)}
          onSelectQuestions={addQuestionsFromBank}
        />
      )}

          {/* AI Content Generator */}
          {showAIGenerator && (
            <EnhancedAIGenerator
              onQuestionsGenerated={(questions) => {
                questions.forEach(questionData => {
                  const newQuestion = {
                    id: crypto.randomUUID(),
                    title: questionData.title || '',
                    question_text: questionData.question_text || '',
                    question_type: questionData.question_type || 'mcq',
                    difficulty: questionData.difficulty || 'intermediate', 
                    points: questionData.points || 10,
                    order_index: assessment.questions.length,
                    config: questionData.config || {},
                  };
                  
                  setAssessment(prev => ({
                    ...prev,
                    questions: [...prev.questions, newQuestion]
                  }));
                });
                
                setShowAIGenerator(false);
                toast({
                  title: "Questions Generated",
                  description: `${questions.length} question(s) added to your assessment`,
                });
              }}
              assessmentContext={{
                title: assessment.title,
                description: assessment.description,
                duration_minutes: assessment.duration_minutes,
                existingQuestionsCount: assessment.questions.length,
                targetSkills: [] // Could extract from existing questions
              }}
            />
          )}

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

            {/* Question Configuration */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Question Configuration</Label>
              <EnhancedQuestionBuilders
                questionType={currentQuestion.question_type}
                config={currentQuestion.config}
                onConfigChange={(config) => setCurrentQuestion(prev => ({ ...prev, config }))}
                questionDescription={currentQuestion.question_text}
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

      {/* Quality Gates Modal */}
      {showQualityGates && assessmentId && (
        <Dialog open={showQualityGates} onOpenChange={setShowQualityGates}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assessment Quality Check</DialogTitle>
            </DialogHeader>
            <AssessmentQualityGates
              assessmentId={assessmentId}
              onPublish={() => {
                setShowQualityGates(false);
                toast({
                  title: "Assessment Published!",
                  description: "Your assessment has been published successfully.",
                });
              }}
              onPreview={() => {
                setShowQualityGates(false);
                // Implement preview logic
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CreateAssessment;