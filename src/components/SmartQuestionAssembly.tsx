import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Target, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Sparkles,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  BookOpen
} from 'lucide-react';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useToast } from '@/hooks/use-toast';

interface LearningObjective {
  id: string;
  name: string;
  description: string;
  weight: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface AssemblyConfiguration {
  totalQuestions: number;
  duration: number;
  difficulty: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  questionTypes: {
    coding: number;
    mcq: number;
    subjective: number;
    fileUpload: number;
  };
  learningObjectives: LearningObjective[];
  targetAudience: 'students' | 'professionals' | 'mixed';
  assessmentType: 'diagnostic' | 'formative' | 'summative' | 'certification';
}

interface SmartQuestionAssemblyProps {
  onAssemblyComplete: (questions: any[]) => void;
  existingQuestions?: any[];
}

const SmartQuestionAssembly: React.FC<SmartQuestionAssemblyProps> = ({
  onAssemblyComplete,
  existingQuestions = []
}) => {
  const { questions, loading } = useQuestionBank();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<AssemblyConfiguration>({
    totalQuestions: 10,
    duration: 60,
    difficulty: {
      beginner: 30,
      intermediate: 50,
      advanced: 20
    },
    questionTypes: {
      coding: 40,
      mcq: 30,
      subjective: 20,
      fileUpload: 10
    },
    learningObjectives: [],
    targetAudience: 'students',
    assessmentType: 'formative'
  });

  const [assemblyStatus, setAssemblyStatus] = useState<'idle' | 'analyzing' | 'assembling' | 'complete'>('idle');
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const [recommendedQuestions, setRecommendedQuestions] = useState<any[]>([]);
  const [qualityScore, setQualityScore] = useState<number>(0);

  const predefinedObjectives: LearningObjective[] = [
    {
      id: '1',
      name: 'Algorithm Design',
      description: 'Understanding and implementing efficient algorithms',
      weight: 30,
      skillLevel: 'intermediate'
    },
    {
      id: '2',
      name: 'Data Structures',
      description: 'Working with arrays, trees, graphs, and other data structures',
      weight: 25,
      skillLevel: 'intermediate'
    },
    {
      id: '3',
      name: 'Problem Solving',
      description: 'Breaking down complex problems into manageable parts',
      weight: 20,
      skillLevel: 'beginner'
    },
    {
      id: '4',
      name: 'Code Quality',
      description: 'Writing clean, maintainable, and efficient code',
      weight: 15,
      skillLevel: 'advanced'
    },
    {
      id: '5',
      name: 'System Design',
      description: 'Designing scalable and robust software systems',
      weight: 10,
      skillLevel: 'advanced'
    }
  ];

  const runSmartAssembly = async () => {
    setAssemblyStatus('analyzing');
    setAssemblyProgress(0);

    try {
      // Simulate AI analysis and assembly process
      const steps = [
        { message: 'Analyzing learning objectives...', duration: 1000 },
        { message: 'Evaluating question pool...', duration: 1500 },
        { message: 'Calculating difficulty distribution...', duration: 1000 },
        { message: 'Optimizing question selection...', duration: 2000 },
        { message: 'Validating assessment quality...', duration: 1000 }
      ];

      setAssemblyStatus('assembling');

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, steps[i].duration));
        setAssemblyProgress((i + 1) * 20);
      }

      // Mock smart assembly algorithm
      const assembledQuestions = mockSmartAssembly(questions, config);
      const quality = calculateAssemblyQuality(assembledQuestions);

      setRecommendedQuestions(assembledQuestions);
      setQualityScore(quality);
      setAssemblyStatus('complete');

      toast({
        title: "Smart Assembly Complete!",
        description: `Generated ${assembledQuestions.length} optimized questions with ${quality}% quality score.`
      });

    } catch (error) {
      toast({
        title: "Assembly Failed",
        description: "Failed to complete smart assembly. Please try again.",
        variant: "destructive"
      });
      setAssemblyStatus('idle');
    }
  };

  const mockSmartAssembly = (availableQuestions: any[], config: AssemblyConfiguration) => {
    // Simple algorithm for demonstration - in real implementation, this would be AI-powered
    const selected: any[] = [];
    const difficultyTargets = {
      beginner: Math.round(config.totalQuestions * config.difficulty.beginner / 100),
      intermediate: Math.round(config.totalQuestions * config.difficulty.intermediate / 100),
      advanced: Math.round(config.totalQuestions * config.difficulty.advanced / 100)
    };

    const typeTargets = {
      coding: Math.round(config.totalQuestions * config.questionTypes.coding / 100),
      mcq: Math.round(config.totalQuestions * config.questionTypes.mcq / 100),
      subjective: Math.round(config.totalQuestions * config.questionTypes.subjective / 100),
      file_upload: Math.round(config.totalQuestions * config.questionTypes.fileUpload / 100)
    };

    // Group questions by type and difficulty
    const grouped = availableQuestions.reduce((acc, q) => {
      const key = `${q.question_type}_${q.difficulty}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {});

    // Select questions based on targets
    Object.entries(typeTargets).forEach(([type, target]) => {
      Object.entries(difficultyTargets).forEach(([difficulty, diffTarget]) => {
        const key = `${type}_${difficulty}`;
        const available = grouped[key] || [];
        const needed = Math.round(target * diffTarget / config.totalQuestions);
        
        for (let i = 0; i < Math.min(needed, available.length); i++) {
          if (selected.length < config.totalQuestions) {
            selected.push({
              ...available[i],
              assemblyReason: `Selected for ${difficulty} ${type} question (${i + 1}/${needed})`,
              qualityScore: Math.random() * 40 + 60 // Mock quality score
            });
          }
        }
      });
    });

    return selected.slice(0, config.totalQuestions);
  };

  const calculateAssemblyQuality = (questions: any[]) => {
    if (questions.length === 0) return 0;
    
    // Mock quality calculation
    const avgQuality = questions.reduce((sum, q) => sum + (q.qualityScore || 75), 0) / questions.length;
    const difficultyBalance = Math.abs(50 - avgQuality) < 20 ? 10 : 5;
    const typeVariety = new Set(questions.map(q => q.question_type)).size * 5;
    
    return Math.min(Math.round(avgQuality + difficultyBalance + typeVariety), 100);
  };

  const addLearningObjective = (objective: LearningObjective) => {
    setConfig(prev => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, objective]
    }));
  };

  const removeLearningObjective = (id: string) => {
    setConfig(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter(obj => obj.id !== id)
    }));
  };

  const updateDifficulty = (difficulty: string, value: number[]) => {
    const total = Object.values(config.difficulty).reduce((sum, val) => sum + val, 0) - config.difficulty[difficulty as keyof typeof config.difficulty] + value[0];
    
    if (total <= 100) {
      setConfig(prev => ({
        ...prev,
        difficulty: {
          ...prev.difficulty,
          [difficulty]: value[0]
        }
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Smart Question Assembly
          </CardTitle>
          <CardDescription>
            AI-powered question selection and assembly based on learning objectives and difficulty optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="objectives" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="objectives">Objectives</TabsTrigger>
              <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
              <TabsTrigger value="types">Question Types</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="objectives" className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Learning Objectives</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Define what students should learn from this assessment
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {predefinedObjectives.map(objective => (
                    <Card key={objective.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{objective.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{objective.skillLevel}</Badge>
                              <span className="text-xs text-muted-foreground">Weight: {objective.weight}%</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={config.learningObjectives.find(obj => obj.id === objective.id) ? "default" : "outline"}
                            onClick={() => {
                              if (config.learningObjectives.find(obj => obj.id === objective.id)) {
                                removeLearningObjective(objective.id);
                              } else {
                                addLearningObjective(objective);
                              }
                            }}
                          >
                            {config.learningObjectives.find(obj => obj.id === objective.id) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {config.learningObjectives.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Selected Objectives</h4>
                    <div className="flex flex-wrap gap-2">
                      {config.learningObjectives.map(obj => (
                        <Badge key={obj.id} variant="default" className="gap-1">
                          {obj.name}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeLearningObjective(obj.id)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="difficulty" className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Difficulty Distribution</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Adjust the percentage of questions for each difficulty level
                </p>
                
                <div className="space-y-6">
                  {Object.entries(config.difficulty).map(([level, value]) => (
                    <div key={level} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{level}</Label>
                        <span className="text-sm font-medium">{value}%</span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={(val) => updateDifficulty(level, val)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm">
                    <strong>Total: </strong>
                    {Object.values(config.difficulty).reduce((sum, val) => sum + val, 0)}%
                  </div>
                  {Object.values(config.difficulty).reduce((sum, val) => sum + val, 0) !== 100 && (
                    <div className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Percentages should add up to 100%
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="types" className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Question Type Distribution</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Balance different types of questions for comprehensive assessment
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(config.questionTypes).map(([type, value]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{type.replace(/([A-Z])/g, ' $1')}</Label>
                        <span className="text-sm font-medium">{value}%</span>
                      </div>
                      <Slider
                        value={[value]}
                        onValueChange={(val) => setConfig(prev => ({
                          ...prev,
                          questionTypes: {
                            ...prev.questionTypes,
                            [type]: val[0]
                          }
                        }))}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalQuestions">Total Questions</Label>
                  <Input
                    id="totalQuestions"
                    type="number"
                    value={config.totalQuestions}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      totalQuestions: parseInt(e.target.value) || 10
                    }))}
                    min={1}
                    max={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={config.duration}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      duration: parseInt(e.target.value) || 60
                    }))}
                    min={5}
                    max={300}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Select value={config.targetAudience} onValueChange={(value: any) => setConfig(prev => ({ ...prev, targetAudience: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="professionals">Professionals</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessmentType">Assessment Type</Label>
                  <Select value={config.assessmentType} onValueChange={(value: any) => setConfig(prev => ({ ...prev, assessmentType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnostic">Diagnostic</SelectItem>
                      <SelectItem value="formative">Formative</SelectItem>
                      <SelectItem value="summative">Summative</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Available questions: {questions.length} | Selected objectives: {config.learningObjectives.length}
            </div>
            <Button
              onClick={runSmartAssembly}
              disabled={assemblyStatus !== 'idle' || config.learningObjectives.length === 0}
              className="gap-2"
            >
              {assemblyStatus === 'idle' && <Sparkles className="w-4 h-4" />}
              {assemblyStatus === 'analyzing' && <Brain className="w-4 h-4 animate-pulse" />}
              {assemblyStatus === 'assembling' && <Zap className="w-4 h-4 animate-pulse" />}
              {assemblyStatus === 'complete' && <CheckCircle className="w-4 h-4" />}
              {assemblyStatus === 'idle' ? 'Start Smart Assembly' :
               assemblyStatus === 'analyzing' ? 'Analyzing...' :
               assemblyStatus === 'assembling' ? 'Assembling...' :
               'Complete'}
            </Button>
          </div>

          {assemblyStatus !== 'idle' && assemblyStatus !== 'complete' && (
            <div className="mt-4">
              <Progress value={assemblyProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {assemblyProgress < 20 ? 'Analyzing learning objectives...' :
                 assemblyProgress < 40 ? 'Evaluating question pool...' :
                 assemblyProgress < 60 ? 'Calculating difficulty distribution...' :
                 assemblyProgress < 80 ? 'Optimizing question selection...' :
                 'Validating assessment quality...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {assemblyStatus === 'complete' && recommendedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Assembly Results
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Quality: {qualityScore}%
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="w-3 h-3" />
                  {recommendedQuestions.length} Questions
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Estimated Time</span>
                  </div>
                  <div className="text-2xl font-bold">{config.duration} min</div>
                  <div className="text-xs text-muted-foreground">
                    ~{Math.round(config.duration / config.totalQuestions)} min per question
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Difficulty Balance</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round((config.difficulty.intermediate + config.difficulty.advanced) / 2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Intermediate to Advanced
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Coverage</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {config.learningObjectives.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Learning Objectives
                  </div>
                </Card>
              </div>

              <div className="space-y-3">
                {recommendedQuestions.slice(0, 5).map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{question.question_type}</Badge>
                          <Badge variant="secondary">{question.difficulty}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Quality: {Math.round(question.qualityScore)}%
                          </span>
                        </div>
                        <h4 className="font-medium">{question.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.assemblyReason}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{question.points} pts</div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {recommendedQuestions.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground">
                    ... and {recommendedQuestions.length - 5} more questions
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setAssemblyStatus('idle')}>
                  Modify Configuration
                </Button>
                <Button onClick={() => onAssemblyComplete(recommendedQuestions)}>
                  Use These Questions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartQuestionAssembly;