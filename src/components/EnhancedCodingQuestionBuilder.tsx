import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Code2, 
  Play, 
  Bug, 
  Zap, 
  TestTube,
  Lightbulb,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useEnhancedCodeExecution } from '@/hooks/useEnhancedCodeExecution';
import { useToast } from '@/hooks/use-toast';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
  weight: number;
  isHidden: boolean;
}

interface CodingQuestionConfig {
  title: string;
  description: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  timeLimit?: number;
  starterCode: string;
  solutionCode?: string;
  testCases: TestCase[];
  hints: string[];
  allowedLanguages: string[];
  executionLimits: {
    timeoutMs: number;
    memoryMB: number;
  };
}

interface EnhancedCodingQuestionBuilderProps {
  onSave: (config: CodingQuestionConfig) => void;
  initialConfig?: Partial<CodingQuestionConfig>;
}

const EnhancedCodingQuestionBuilder: React.FC<EnhancedCodingQuestionBuilderProps> = ({
  onSave,
  initialConfig
}) => {
  const { toast } = useToast();
  const {
    executeCode,
    analyzeCodeQuality,
    getOptimizationSuggestions,
    debugStepByStep,
    validateSyntax,
    isExecuting,
    executionHistory
  } = useEnhancedCodeExecution();

  const [config, setConfig] = useState<CodingQuestionConfig>({
    title: '',
    description: '',
    language: 'javascript',
    difficulty: 'intermediate',
    points: 10,
    starterCode: '',
    testCases: [],
    hints: [],
    allowedLanguages: ['javascript'],
    executionLimits: {
      timeoutMs: 5000,
      memoryMB: 128
    },
    ...initialConfig
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [codeQuality, setCodeQuality] = useState<any>(null);
  const [syntaxValid, setSyntaxValid] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [optimizations, setOptimizations] = useState<any[]>([]);

  const updateConfig = (updates: Partial<CodingQuestionConfig>) => {
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
      testCases: [...config.testCases, newTestCase]
    });
  };

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    updateConfig({
      testCases: config.testCases.map(tc => 
        tc.id === id ? { ...tc, ...updates } : tc
      )
    });
  };

  const removeTestCase = (id: string) => {
    updateConfig({
      testCases: config.testCases.filter(tc => tc.id !== id)
    });
  };

  const addHint = () => {
    updateConfig({
      hints: [...config.hints, '']
    });
  };

  const updateHint = (index: number, value: string) => {
    const newHints = [...config.hints];
    newHints[index] = value;
    updateConfig({ hints: newHints });
  };

  const removeHint = (index: number) => {
    updateConfig({
      hints: config.hints.filter((_, i) => i !== index)
    });
  };

  const runCodeTest = async () => {
    if (!config.starterCode.trim()) {
      toast({
        title: "No Code to Test",
        description: "Please enter some starter code first",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await executeCode(
        config.starterCode,
        config.language,
        config.testCases,
        {
          debugMode: false,
          performanceAnalysis: true,
          enableHints: true
        }
      );

      // Update quality assessment
      setCodeQuality(result.codeQuality);
      
      if (result.optimizationSuggestions) {
        setOptimizations(result.optimizationSuggestions.suggestions || []);
      }

      toast({
        title: "Code Analysis Complete",
        description: `Quality Score: ${result.codeQuality?.score || 0}%. ${result.testResults?.filter(t => t.passed).length || 0}/${result.testResults?.length || 0} tests passed.`
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const runDebugAnalysis = async () => {
    if (!config.starterCode.trim()) return;

    try {
      const debugging = await debugStepByStep(
        config.starterCode,
        config.language,
        config.testCases
      );
      
      setDebugInfo(debugging);
      
      toast({
        title: "Debug Analysis Complete",
        description: "Step-by-step execution trace generated"
      });
    } catch (error: any) {
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const validateCodeSyntax = async () => {
    if (!config.starterCode.trim()) return;

    try {
      const validation = await validateSyntax(config.starterCode, config.language);
      setSyntaxValid(validation.isValid);
      
      if (!validation.isValid) {
        toast({
          title: "Syntax Issues Found",
          description: validation.errors[0] || "Code has syntax errors",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Syntax Valid",
          description: "Code syntax is correct"
        });
      }
    } catch (error: any) {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const generateTestCases = async () => {
    if (!config.description.trim()) {
      toast({
        title: "Need Description",
        description: "Please provide a problem description first",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('generate-test-cases', {
        body: {
          problemDescription: config.description,
          language: config.language || 'javascript',
          difficulty: config.difficulty || 'medium',
          existingTestCases: config.testCases
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { testCases, starterCodeTemplate, hints } = response.data;

      // Convert AI test cases to the format expected by the component
      const formattedTestCases = testCases.map((tc: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        description: tc.description,
        weight: tc.points || 1,
        isHidden: !tc.isVisible
      }));

      updateConfig({
        testCases: [...config.testCases, ...formattedTestCases],
        starterCode: config.starterCode || starterCodeTemplate,
        hints: [...(config.hints || []), ...(hints || [])]
      });

      toast({
        title: "Test Cases Generated",
        description: `Generated ${testCases.length} comprehensive test cases with AI assistance.`
      });
    } catch (error: any) {
      console.error('Test case generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Real-time syntax validation
  useEffect(() => {
    if (config.starterCode.trim()) {
      const timer = setTimeout(() => {
        validateCodeSyntax();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [config.starterCode]);

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

    if (config.testCases.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one test case is required",
        variant: "destructive"
      });
      return;
    }

    onSave(config);
    
    toast({
      title: "Question Saved",
      description: "Enhanced coding question has been created successfully"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Enhanced Coding Question Builder
            {syntaxValid !== null && (
              <Badge variant={syntaxValid ? "default" : "destructive"}>
                {syntaxValid ? "Valid Syntax" : "Syntax Errors"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Create sophisticated coding challenges with AI-powered testing, debugging, and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Question Title</Label>
                  <Input
                    id="title"
                    value={config.title}
                    onChange={(e) => updateConfig({ title: e.target.value })}
                    placeholder="e.g., Two Sum Problem"
                  />
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
                  <Label htmlFor="language">Primary Language</Label>
                  <Select value={config.language} onValueChange={(value) => updateConfig({ language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Label htmlFor="description">Problem Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  placeholder="Provide a clear description of the coding problem..."
                  rows={6}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="timeLimit"
                  checked={!!config.timeLimit}
                  onCheckedChange={(checked) => updateConfig({ 
                    timeLimit: checked ? 1800 : undefined 
                  })}
                />
                <Label htmlFor="timeLimit">Set Time Limit (seconds)</Label>
                {config.timeLimit && (
                  <Input
                    type="number"
                    value={config.timeLimit}
                    onChange={(e) => updateConfig({ timeLimit: parseInt(e.target.value) || 1800 })}
                    className="w-24"
                    min={60}
                    max={7200}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="starterCode">Starter Code</Label>
                  <div className="flex gap-2">
                    <Button onClick={validateCodeSyntax} size="sm" variant="outline" disabled={isExecuting}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validate
                    </Button>
                    <Button onClick={runCodeTest} size="sm" disabled={isExecuting}>
                      <Play className="w-4 h-4 mr-2" />
                      {isExecuting ? 'Testing...' : 'Test Code'}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="starterCode"
                  value={config.starterCode}
                  onChange={(e) => updateConfig({ starterCode: e.target.value })}
                  placeholder="// Write your starter code here..."
                  rows={12}
                  className="font-mono text-sm"
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
                
                {config.hints.map((hint, index) => (
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

              {codeQuality && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Code Quality Analysis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span>Quality Score:</span>
                      <Progress value={codeQuality.score} className="flex-1" />
                      <span className="font-medium">{codeQuality.score}%</span>
                    </div>
                    {codeQuality.suggestions?.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Suggestions:</span>
                        <ul className="text-sm text-muted-foreground ml-4">
                          {codeQuality.suggestions.slice(0, 3).map((suggestion: string, i: number) => (
                            <li key={i}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tests" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Test Cases</Label>
                <div className="flex gap-2">
                  <Button onClick={generateTestCases} size="sm" variant="outline">
                    <Zap className="w-4 h-4 mr-2" />
                    AI Generate
                  </Button>
                  <Button onClick={addTestCase} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {config.testCases.map((testCase, index) => (
                  <Card key={testCase.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Test Case {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={testCase.isHidden}
                            onCheckedChange={(checked) => updateTestCase(testCase.id, { isHidden: checked })}
                          />
                          <Label className="text-sm">Hidden</Label>
                          <Button
                            onClick={() => removeTestCase(testCase.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Input</Label>
                          <Textarea
                            value={testCase.input}
                            onChange={(e) => updateTestCase(testCase.id, { input: e.target.value })}
                            placeholder="Input parameters"
                            rows={3}
                            className="font-mono text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Expected Output</Label>
                          <Textarea
                            value={testCase.expectedOutput}
                            onChange={(e) => updateTestCase(testCase.id, { expectedOutput: e.target.value })}
                            placeholder="Expected result"
                            rows={3}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={testCase.description}
                            onChange={(e) => updateTestCase(testCase.id, { description: e.target.value })}
                            placeholder="Test case description"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Weight</Label>
                          <Input
                            type="number"
                            value={testCase.weight}
                            onChange={(e) => updateTestCase(testCase.id, { weight: parseInt(e.target.value) || 1 })}
                            min={1}
                            max={10}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {config.testCases.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No test cases yet. Add some test cases to validate solutions.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Performance Analysis</h3>
                <Button onClick={runCodeTest} disabled={isExecuting} className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {isExecuting ? 'Analyzing...' : 'Analyze Code'}
                </Button>
              </div>

              {optimizations.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Optimization Suggestions
                  </h4>
                  <div className="space-y-3">
                    {optimizations.map((opt, index) => (
                      <div key={index} className="border-l-4 border-blue-200 pl-4">
                        <div className="font-medium">{opt.type}</div>
                        <div className="text-sm text-muted-foreground">{opt.description}</div>
                        <Badge variant="outline" className="mt-1">
                          Impact: {opt.impact}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {executionHistory.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Execution History</h4>
                  <div className="space-y-2">
                    {executionHistory.slice(0, 5).map((execution, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          {execution.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {execution.testResults?.filter(t => t.passed).length || 0}/
                            {execution.testResults?.length || 0} tests passed
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {execution.executionTime}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="debug" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Debug Analysis</h3>
                <Button onClick={runDebugAnalysis} disabled={isExecuting} className="gap-2">
                  <Bug className="w-4 h-4" />
                  {isExecuting ? 'Debugging...' : 'Debug Code'}
                </Button>
              </div>

              {debugInfo && (
                <div className="space-y-4">
                  {debugInfo.trace && debugInfo.trace.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Execution Trace</h4>
                      <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
                        {debugInfo.trace.map((step: string, index: number) => (
                          <div key={index} className="mb-1">
                            <span className="text-gray-500">{index + 1}:</span> {step}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {debugInfo.breakpoints && debugInfo.breakpoints.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Suggested Breakpoints</h4>
                      <div className="space-y-2">
                        {debugInfo.breakpoints.map((bp: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <Badge variant="outline">Line {bp.line}</Badge>
                            <span className="text-sm">{bp.condition}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{config.title || 'Untitled Question'}</h3>
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="outline">{config.difficulty}</Badge>
                  <Badge variant="outline">{config.points} points</Badge>
                  <Badge variant="outline">{config.language}</Badge>
                  {config.timeLimit && (
                    <Badge variant="outline">{Math.floor(config.timeLimit / 60)}min</Badge>
                  )}
                </div>
                
                <div className="prose max-w-none mb-6">
                  <p>{config.description || 'No description provided.'}</p>
                </div>

                {config.starterCode && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Starter Code:</h4>
                    <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                      <code>{config.starterCode}</code>
                    </pre>
                  </div>
                )}

                {config.hints.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Hints:</h4>
                    <ul className="space-y-1">
                      {config.hints.map((hint, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          {index + 1}. {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Test Cases ({config.testCases.length}):</h4>
                  <div className="space-y-2">
                    {config.testCases.slice(0, 2).map((tc, index) => (
                      <div key={tc.id} className="text-sm bg-muted/30 p-3 rounded">
                        <div className="font-medium">Example {index + 1}:</div>
                        <div>Input: <code>{tc.input}</code></div>
                        <div>Output: <code>{tc.expectedOutput}</code></div>
                      </div>
                    ))}
                    {config.testCases.length > 2 && (
                      <div className="text-sm text-muted-foreground">
                        + {config.testCases.length - 2} more test cases
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TestTube className="w-4 h-4" />
              {config.testCases.length} test cases
              <Lightbulb className="w-4 h-4 ml-4" />
              {config.hints.length} hints
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('preview')}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={validateAndSave}>
                Save Question
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCodingQuestionBuilder;