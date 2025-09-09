import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Code2, 
  Play, 
  Volume2, 
  Video, 
  Image, 
  FileText,
  Settings,
  Brain,
  TestTube,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuestionConfig {
  type: 'coding' | 'interactive-media' | 'scenario-based' | 'adaptive';
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  timeLimit?: number;
  
  // Coding specific
  language?: string;
  starterCode?: string;
  testCases?: TestCase[];
  hints?: string[];
  
  // Interactive media specific
  mediaType?: 'audio' | 'video' | 'image';
  mediaUrl?: string;
  transcription?: string;
  
  // Scenario-based specific
  scenario?: string;
  contextData?: any;
  decisionPoints?: DecisionPoint[];
  
  // Adaptive specific
  adaptiveRules?: AdaptiveRule[];
  prerequisiteSkills?: string[];
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
  weight: number;
  isHidden: boolean;
}

interface DecisionPoint {
  id: string;
  prompt: string;
  options: {
    id: string;
    text: string;
    consequence: string;
    points: number;
  }[];
}

interface AdaptiveRule {
  id: string;
  condition: string;
  action: 'increase_difficulty' | 'decrease_difficulty' | 'provide_hint' | 'skip_question';
  parameters: any;
}

interface AdvancedQuestionBuilderProps {
  onSave: (config: QuestionConfig) => void;
  initialConfig?: Partial<QuestionConfig>;
}

const AdvancedQuestionBuilder: React.FC<AdvancedQuestionBuilderProps> = ({
  onSave,
  initialConfig
}) => {
  const { toast } = useToast();
  
  const [config, setConfig] = useState<QuestionConfig>({
    type: 'coding',
    title: '',
    description: '',
    difficulty: 'intermediate',
    points: 10,
    ...initialConfig
  });

  const [activeTab, setActiveTab] = useState('basic');

  const updateConfig = (updates: Partial<QuestionConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: '',
      expectedOutput: '',
      description: '',
      weight: 1,
      isHidden: false
    };
    
    updateConfig({
      testCases: [...(config.testCases || []), newTestCase]
    });
  };

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    updateConfig({
      testCases: config.testCases?.map(tc => 
        tc.id === id ? { ...tc, ...updates } : tc
      )
    });
  };

  const removeTestCase = (id: string) => {
    updateConfig({
      testCases: config.testCases?.filter(tc => tc.id !== id)
    });
  };

  const addHint = () => {
    updateConfig({
      hints: [...(config.hints || []), '']
    });
  };

  const updateHint = (index: number, value: string) => {
    const newHints = [...(config.hints || [])];
    newHints[index] = value;
    updateConfig({ hints: newHints });
  };

  const removeHint = (index: number) => {
    updateConfig({
      hints: config.hints?.filter((_, i) => i !== index)
    });
  };

  const addDecisionPoint = () => {
    const newDecisionPoint: DecisionPoint = {
      id: Date.now().toString(),
      prompt: '',
      options: [
        { id: '1', text: '', consequence: '', points: 5 },
        { id: '2', text: '', consequence: '', points: 3 }
      ]
    };
    
    updateConfig({
      decisionPoints: [...(config.decisionPoints || []), newDecisionPoint]
    });
  };

  const validateAndSave = () => {
    if (!config.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Question title is required",
        variant: "destructive"
      });
      return;
    }

    if (!config.description.trim()) {
      toast({
        title: "Validation Error", 
        description: "Question description is required",
        variant: "destructive"
      });
      return;
    }

    // Type-specific validation
    if (config.type === 'coding' && (!config.testCases || config.testCases.length === 0)) {
      toast({
        title: "Validation Error",
        description: "At least one test case is required for coding questions",
        variant: "destructive"
      });
      return;
    }

    onSave(config);
    
    toast({
      title: "Question Saved",
      description: "Advanced question has been created successfully"
    });
  };

  const previewQuestion = () => {
    // In real implementation, this would open a preview modal
    toast({
      title: "Preview",
      description: "Question preview would open here"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Advanced Question Builder
          </CardTitle>
          <CardDescription>
            Create sophisticated questions with interactive elements, adaptive behavior, and multimedia content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="adaptive">Adaptive</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Question Type</Label>
                  <Select value={config.type} onValueChange={(value: any) => updateConfig({ type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coding">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          Coding Challenge
                        </div>
                      </SelectItem>
                      <SelectItem value="interactive-media">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Interactive Media
                        </div>
                      </SelectItem>
                      <SelectItem value="scenario-based">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Scenario-Based
                        </div>
                      </SelectItem>
                      <SelectItem value="adaptive">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          Adaptive Question
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={config.difficulty} onValueChange={(value: any) => updateConfig({ difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Question Title</Label>
                  <Input
                    id="title"
                    value={config.title}
                    onChange={(e) => updateConfig({ title: e.target.value })}
                    placeholder="Enter a descriptive title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={config.points}
                    onChange={(e) => updateConfig({ points: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Question Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="Provide a clear description of what the question asks"
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="timeLimit"
                  checked={!!config.timeLimit}
                  onCheckedChange={(checked) => updateConfig({ 
                    timeLimit: checked ? 300 : undefined 
                  })}
                />
                <Label htmlFor="timeLimit">Set Time Limit</Label>
                {config.timeLimit && (
                  <Input
                    type="number"
                    value={config.timeLimit}
                    onChange={(e) => updateConfig({ timeLimit: parseInt(e.target.value) || 300 })}
                    className="w-20"
                    min={30}
                    max={3600}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              {config.type === 'coding' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Programming Language</Label>
                    <Select value={config.language || 'javascript'} onValueChange={(value) => updateConfig({ language: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="javascript">JavaScript</SelectItem>
                       <SelectItem value="python">Python</SelectItem>
                       <SelectItem value="java">Java</SelectItem>
                       <SelectItem value="cpp">C++</SelectItem>
                       <SelectItem value="typescript">TypeScript</SelectItem>
                       <SelectItem value="go">Go</SelectItem>
                       <SelectItem value="selenium-java">Selenium (Java)</SelectItem>
                       <SelectItem value="selenium-python">Selenium (Python)</SelectItem>
                       <SelectItem value="selenium-csharp">Selenium (C#)</SelectItem>
                       <SelectItem value="selenium-javascript">Selenium (JavaScript)</SelectItem>
                     </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="starterCode">Starter Code (Optional)</Label>
                    <Textarea
                      id="starterCode"
                      value={config.starterCode || ''}
                      onChange={(e) => updateConfig({ starterCode: e.target.value })}
                      placeholder="// Provide starter code for students"
                      rows={8}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Hints</Label>
                      <Button onClick={addHint} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Hint
                      </Button>
                    </div>
                    
                    {config.hints?.map((hint, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={hint}
                          onChange={(e) => updateHint(index, e.target.value)}
                          placeholder={`Hint ${index + 1}`}
                        />
                        <Button
                          onClick={() => removeHint(index)}
                          size="sm"
                          variant="outline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {config.type === 'scenario-based' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenario">Scenario Description</Label>
                    <Textarea
                      id="scenario"
                      value={config.scenario || ''}
                      onChange={(e) => updateConfig({ scenario: e.target.value })}
                      placeholder="Describe the scenario or case study..."
                      rows={6}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Decision Points</Label>
                      <Button onClick={addDecisionPoint} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Decision Point
                      </Button>
                    </div>

                    {config.decisionPoints?.map((dp, index) => (
                      <Card key={dp.id} className="p-4">
                        <div className="space-y-3">
                          <Input
                            value={dp.prompt}
                            onChange={(e) => {
                              const updated = config.decisionPoints?.map(d => 
                                d.id === dp.id ? { ...d, prompt: e.target.value } : d
                              );
                              updateConfig({ decisionPoints: updated });
                            }}
                            placeholder="Decision prompt"
                          />
                          {dp.options.map((option, optIndex) => (
                            <div key={option.id} className="grid grid-cols-3 gap-2">
                              <Input
                                value={option.text}
                                placeholder={`Option ${optIndex + 1}`}
                                onChange={(e) => {
                                  const updated = config.decisionPoints?.map(d => 
                                    d.id === dp.id ? {
                                      ...d,
                                      options: d.options.map(o => 
                                        o.id === option.id ? { ...o, text: e.target.value } : o
                                      )
                                    } : d
                                  );
                                  updateConfig({ decisionPoints: updated });
                                }}
                              />
                              <Input
                                value={option.consequence}
                                placeholder="Consequence"
                                onChange={(e) => {
                                  const updated = config.decisionPoints?.map(d => 
                                    d.id === dp.id ? {
                                      ...d,
                                      options: d.options.map(o => 
                                        o.id === option.id ? { ...o, consequence: e.target.value } : o
                                      )
                                    } : d
                                  );
                                  updateConfig({ decisionPoints: updated });
                                }}
                              />
                              <Input
                                type="number"
                                value={option.points}
                                placeholder="Points"
                                onChange={(e) => {
                                  const updated = config.decisionPoints?.map(d => 
                                    d.id === dp.id ? {
                                      ...d,
                                      options: d.options.map(o => 
                                        o.id === option.id ? { ...o, points: parseInt(e.target.value) || 0 } : o
                                      )
                                    } : d
                                  );
                                  updateConfig({ decisionPoints: updated });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              {config.type === 'coding' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Test Cases</Label>
                    <Button onClick={addTestCase} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Test Case
                    </Button>
                  </div>

                  {config.testCases?.map((testCase) => (
                    <Card key={testCase.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={testCase.description}
                            onChange={(e) => updateTestCase(testCase.id, { description: e.target.value })}
                            placeholder="Test case description"
                          />
                          <Button
                            onClick={() => removeTestCase(testCase.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) => updateTestCase(testCase.id, { input: e.target.value })}
                              placeholder="Test input"
                              rows={3}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Output</Label>
                            <Textarea
                              value={testCase.expectedOutput}
                              onChange={(e) => updateTestCase(testCase.id, { expectedOutput: e.target.value })}
                              placeholder="Expected output"
                              rows={3}
                              className="font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`weight-${testCase.id}`}>Weight:</Label>
                            <Input
                              id={`weight-${testCase.id}`}
                              type="number"
                              value={testCase.weight}
                              onChange={(e) => updateTestCase(testCase.id, { weight: parseFloat(e.target.value) || 1 })}
                              className="w-20"
                              min={0}
                              max={10}
                              step={0.1}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`hidden-${testCase.id}`}
                              checked={testCase.isHidden}
                              onCheckedChange={(checked) => updateTestCase(testCase.id, { isHidden: checked })}
                            />
                            <Label htmlFor={`hidden-${testCase.id}`}>Hidden from students</Label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {(!config.testCases || config.testCases.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No test cases added yet</p>
                      <p className="text-sm">Add test cases to validate student solutions</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="adaptive" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  <Label className="text-base font-semibold">Adaptive Behavior</Label>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Configure how this question adapts based on student performance and behavior
                </p>

                <Card className="p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Prerequisite Skills</Label>
                      <Input
                        placeholder="Enter skills separated by commas"
                        value={config.prerequisiteSkills?.join(', ') || ''}
                        onChange={(e) => updateConfig({ 
                          prerequisiteSkills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Adaptive Rules</Label>
                      <div className="space-y-2">
                        <Card className="p-3 bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4" />
                            <span className="text-sm font-medium">Hint Trigger</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Provide hints if student is stuck for more than 5 minutes
                          </p>
                        </Card>
                        
                        <Card className="p-3 bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">Difficulty Adjustment</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Reduce complexity if multiple incorrect attempts
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mediaType">Media Type</Label>
                  <Select value={config.mediaType || 'none'} onValueChange={(value: any) => updateConfig({ mediaType: value === 'none' ? undefined : value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Media</SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Image
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          Audio
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Video
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.mediaType && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mediaUrl">Media URL</Label>
                      <Input
                        id="mediaUrl"
                        value={config.mediaUrl || ''}
                        onChange={(e) => updateConfig({ mediaUrl: e.target.value })}
                        placeholder="Enter media URL or upload file"
                      />
                    </div>

                    {(config.mediaType === 'audio' || config.mediaType === 'video') && (
                      <div className="space-y-2">
                        <Label htmlFor="transcription">Transcription (for accessibility)</Label>
                        <Textarea
                          id="transcription"
                          value={config.transcription || ''}
                          onChange={(e) => updateConfig({ transcription: e.target.value })}
                          placeholder="Provide transcription for audio/video content"
                          rows={4}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={previewQuestion}>
                <Play className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                Save Draft
              </Button>
              <Button onClick={validateAndSave}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Question
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedQuestionBuilder;