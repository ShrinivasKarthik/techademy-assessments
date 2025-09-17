import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  X, 
  Code, 
  Wand2, 
  TestTube, 
  Target,
  Eye,
  EyeOff,
  Zap,
  Brain,
  Award,
  AlertTriangle,
  CheckCircle,
  Settings,
  Lightbulb,
  FileCode,
  PlayCircle,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SeleniumTemplateSelector from '@/components/SeleniumTemplateSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
  category: 'basic' | 'edge' | 'corner' | 'performance' | 'error';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  isVisible: boolean;
  isHidden: boolean;
  explanation: string;
  inputSize?: string;
  timeComplexityNote?: string;
}

interface RubricDimension {
  name: string;
  description: string;
  weight: number;
  levels: Array<{
    name: string;
    pointRange: [number, number];
    description: string;
    indicators: string[];
  }>;
}

interface CodingQuestionConfig {
  language: string;
  supportedLanguages: string[];
  starterCode: string;
  testCases: TestCase[];
  
  timeLimit?: number;
  memoryLimit?: number;
  rubric?: {
    dimensions: RubricDimension[];
    totalPoints: number;
    passingScore: number;
  };
  hints: string[];
  commonMistakes: string[];
  optimizationTips: string[];
  templates: Array<{
    name: string;
    code: string;
    language: string;
  }>;
}

interface AdvancedCodingQuestionBuilderProps {
  config: CodingQuestionConfig;
  onConfigChange: (config: CodingQuestionConfig) => void;
  questionDescription?: string;
  difficulty?: string;
}

const AdvancedCodingQuestionBuilder: React.FC<AdvancedCodingQuestionBuilderProps> = ({
  config,
  onConfigChange,
  questionDescription = '',
  difficulty = 'intermediate'
}) => {
  const { toast } = useToast();
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'selenium-java', label: 'Selenium (Java)' },
    { value: 'selenium-python', label: 'Selenium (Python)' },
    { value: 'selenium-csharp', label: 'Selenium (C#)' },
    { value: 'selenium-javascript', label: 'Selenium (JavaScript)' }
  ];

  const updateConfig = (updates: Partial<CodingQuestionConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  // Test Case Management
  const addTestCase = () => {
    const newTestCase: TestCase = {
      input: '',
      expectedOutput: '',
      description: '',
      category: 'basic',
      difficulty: 'easy',
      points: 1,
      isVisible: true,
      isHidden: false,
      explanation: ''
    };
    updateConfig({
      testCases: [...config.testCases, newTestCase]
    });
  };

  const updateTestCase = (index: number, updates: Partial<TestCase>) => {
    const newTestCases = [...config.testCases];
    newTestCases[index] = { ...newTestCases[index], ...updates };
    updateConfig({ testCases: newTestCases });
  };

  const removeTestCase = (index: number) => {
    updateConfig({
      testCases: (config.testCases || []).filter((_, i) => i !== index)
    });
  };

  // AI-powered test case generation
  const generateTestCases = async () => {
    if (!questionDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a problem description before generating test cases.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTestCases(true);
    try {
      console.log('Generating test cases with params:', {
        problemDescription: questionDescription,
        language: config.language,
        difficulty,
        existingTestCases: config.testCases?.length || 0
      });

      const response = await supabase.functions.invoke('generate-test-cases', {
        body: {
          problemDescription: questionDescription,
          language: config.language,
          difficulty,
          existingTestCases: config.testCases || []
        }
      });

      console.log('Raw Supabase response:', response);

      // Check for Supabase function errors first
      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(`Function error: ${response.error.message || response.error}`);
      }

      // Check if we got valid data
      if (!response.data) {
        console.error('No data in response:', response);
        throw new Error('No data received from test case generation function');
      }

      console.log('Response data:', response.data);

      // Handle both direct data and wrapped responses
      const responseData = response.data;
      
      // Check if this is an error response disguised as success
      if (responseData.error) {
        console.error('Function returned error:', responseData.error);
        throw new Error(responseData.error);
      }

      // Extract the data with fallbacks
      const testCases = responseData.testCases || [];
      const starterCodeTemplate = responseData.starterCodeTemplate || '';
      const hints = responseData.hints || [];
      const commonMistakes = responseData.commonMistakes || [];
      const optimizationTips = responseData.optimizationTips || [];
      const warning = responseData.warning;

      console.log('Extracted data:', {
        testCasesCount: testCases.length,
        hasStarterCode: !!starterCodeTemplate,
        hintsCount: hints.length,
        mistakesCount: commonMistakes.length,
        tipsCount: optimizationTips.length,
        warning
      });

      // Validate we got actual test cases
      if (!testCases || testCases.length === 0) {
        throw new Error('No test cases were generated. Please provide a more specific problem description.');
      }

      // Update the configuration
      updateConfig({
        testCases: [...(config.testCases || []), ...testCases],
        starterCode: config.starterCode || starterCodeTemplate,
        hints: [...(config.hints || []), ...hints],
        commonMistakes: [...(config.commonMistakes || []), ...commonMistakes],
        optimizationTips: [...(config.optimizationTips || []), ...optimizationTips]
      });

      toast({
        title: "Test Cases Generated",
        description: warning 
          ? `Generated ${testCases.length} test cases (using fallback template)`
          : `Generated ${testCases.length} comprehensive test cases with AI assistance.`,
        variant: warning ? "default" : "default"
      });

    } catch (error) {
      console.error('Test case generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Generation Failed",
        description: `Could not generate test cases: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTestCases(false);
    }
  };

  // AI-powered rubric generation
  const generateRubric = async () => {
    if (!questionDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a problem description before generating rubric.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingRubric(true);
    try {
      const response = await supabase.functions.invoke('generate-rubric', {
        body: {
          questionType: 'coding',
          questionDescription,
          difficulty,
          skills: ['programming', 'problem-solving', 'algorithms']
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { rubric } = response.data;
      updateConfig({ rubric });

      toast({
        title: "Rubric Generated",
        description: "AI-generated rubric with comprehensive evaluation criteria.",
      });
    } catch (error) {
      console.error('Rubric generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate rubric. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  // Template management
  const addTemplate = () => {
    const newTemplate = {
      name: `Template ${config.templates?.length + 1 || 1}`,
      code: '',
      language: config.language
    };
    updateConfig({
      templates: [...(config.templates || []), newTemplate]
    });
  };

  const updateTemplate = (index: number, field: string, value: string) => {
    const newTemplates = [...(config.templates || [])];
    newTemplates[index] = { ...newTemplates[index], [field]: value };
    updateConfig({ templates: newTemplates });
  };

  const removeTemplate = (index: number) => {
    updateConfig({
      templates: (config.templates || []).filter((_, i) => i !== index)
    });
  };

  const handleSeleniumTemplateSelect = (template: any) => {
    updateConfig({
      starterCode: template.starterCode,
      testCases: [
        ...(config.testCases || []),
        ...template.testScenarios.map((scenario: string, index: number) => ({
          input: `Test case ${index + 1}`,
          expectedOutput: 'Expected result based on scenario',
          description: scenario,
          category: 'basic' as const,
          difficulty: 'easy' as const,
          points: 2,
          isVisible: true,
          isHidden: false,
          explanation: `This test validates: ${scenario}`
        }))
      ]
    });
    
    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied with starter code and test scenarios.`
    });
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your template",
        variant: "destructive"
      });
      return;
    }

    const customTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName,
      description: templateDescription || 'Custom Selenium template',
      language: config.language || 'selenium-java',
      category: 'custom' as const,
      starterCode: config.starterCode || '',
      testScenarios: (config.testCases || []).map(tc => ({
        scenario: tc.description || tc.input,
        expectedResult: tc.expectedOutput,
        webElements: tc.explanation ? [tc.explanation] : []
      })),
      icon: <Save className="w-4 h-4" />,
      isCustom: true
    };

    // Save to localStorage
    const existingTemplates = JSON.parse(localStorage.getItem('customSeleniumTemplates') || '[]');
    const updatedTemplates = [...existingTemplates, customTemplate];
    localStorage.setItem('customSeleniumTemplates', JSON.stringify(updatedTemplates));

    toast({
      title: "Template Saved",
      description: `"${templateName}" has been saved as a custom template`,
    });

    // Reset form
    setTemplateName('');
    setTemplateDescription('');
    setSaveTemplateDialog(false);
  };

  const isSeleniumLanguage = (lang: string | undefined) => lang?.startsWith('selenium-') || false;

  const testCasesByCategory = {
    basic: (config.testCases || []).filter(tc => tc.category === 'basic'),
    edge: (config.testCases || []).filter(tc => tc.category === 'edge'),
    corner: (config.testCases || []).filter(tc => tc.category === 'corner'),
    performance: (config.testCases || []).filter(tc => tc.category === 'performance'),
    error: (config.testCases || []).filter(tc => tc.category === 'error')
  };

  const totalPoints = (config.testCases || []).reduce((sum, tc) => sum + tc.points, 0);
  const visiblePoints = (config.testCases || []).filter(tc => tc.isVisible).reduce((sum, tc) => sum + tc.points, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Advanced Coding Question Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="testcases">Test Cases</TabsTrigger>
              <TabsTrigger value="rubric">Rubric</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Settings Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Language</Label>
                  <Select
                    value={config.language}
                    onValueChange={(value) => updateConfig({ language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Supported Languages</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {languages.map(lang => (
                      <div key={lang.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={config.supportedLanguages?.includes(lang.value) || lang.value === (config.language || 'javascript')}
                          onCheckedChange={(checked) => {
                            const current = config.supportedLanguages || [config.language || 'javascript'];
                            if (checked) {
                              updateConfig({
                                supportedLanguages: [...current, lang.value]
                              });
                            } else if (lang.value !== (config.language || 'javascript')) {
                              updateConfig({
                                supportedLanguages: current.filter(l => l !== lang.value)
                              });
                            }
                          }}
                          disabled={lang.value === (config.language || 'javascript')}
                        />
                        <Label className="text-sm">{lang.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selenium Template Selector */}
              {isSeleniumLanguage(config.language) && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-lg font-semibold block">Selenium Test Templates</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose from pre-built Selenium test scenarios or save your own
                        </p>
                      </div>
                      <Dialog open={saveTemplateDialog} onOpenChange={setSaveTemplateDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save as Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Save Custom Selenium Template</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="template-name">Template Name *</Label>
                              <Input
                                id="template-name"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., User Registration Flow"
                              />
                            </div>
                            <div>
                              <Label htmlFor="template-description">Description</Label>
                              <Textarea
                                id="template-description"
                                value={templateDescription}
                                onChange={(e) => setTemplateDescription(e.target.value)}
                                placeholder="Describe what this template tests..."
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setSaveTemplateDialog(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveAsTemplate}>
                                Save Template
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <SeleniumTemplateSelector
                      language={config.language?.replace('selenium-', '') || 'java'}
                      onSelect={handleSeleniumTemplateSelect}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Starter Code</Label>
                <Textarea
                  value={config.starterCode}
                  onChange={(e) => updateConfig({ starterCode: e.target.value })}
                  placeholder={isSeleniumLanguage(config.language) 
                    ? "// Selenium WebDriver code will appear here when you select a template above..."
                    : "// Provide starter code for students..."
                  }
                  className="font-mono text-sm min-h-[200px]"
                />
                {isSeleniumLanguage(config.language) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Select a template above to auto-populate with Selenium WebDriver setup and test structure
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">

                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={config.timeLimit || ''}
                    onChange={(e) => updateConfig({ timeLimit: parseInt(e.target.value) || undefined })}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label>Memory Limit (MB)</Label>
                  <Input
                    type="number"
                    value={config.memoryLimit || ''}
                    onChange={(e) => updateConfig({ memoryLimit: parseInt(e.target.value) || undefined })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Test Cases Tab */}
            <TabsContent value="testcases" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Test Cases</h3>
                  <p className="text-sm text-muted-foreground">
                    Total: {(config.testCases || []).length} cases, {totalPoints} points
                    ({visiblePoints} visible points)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={generateTestCases}
                    disabled={isGeneratingTestCases}
                    className="flex items-center gap-2"
                  >
                    {isGeneratingTestCases ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        AI Generate
                      </>
                    )}
                  </Button>
                  <Button onClick={addTestCase} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Case
                  </Button>
                </div>
              </div>

              {/* Test Case Statistics */}
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(testCasesByCategory).map(([category, cases]) => (
                  <Card key={category} className="p-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{cases.length}</div>
                      <div className="text-xs text-muted-foreground capitalize">{category}</div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Test Cases List */}
              <div className="space-y-3">
                {(config.testCases || []).map((testCase, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={testCase.isVisible ? "default" : "secondary"}>
                            {testCase.isVisible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                            Test Case {index + 1}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {testCase.category}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {testCase.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            {testCase.points} pts
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestCase(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Input</Label>
                          <Textarea
                            value={testCase.input}
                            onChange={(e) => updateTestCase(index, { input: e.target.value })}
                            className="font-mono text-xs"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Expected Output</Label>
                          <Textarea
                            value={testCase.expectedOutput}
                            onChange={(e) => updateTestCase(index, { expectedOutput: e.target.value })}
                            className="font-mono text-xs"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={testCase.description}
                          onChange={(e) => updateTestCase(index, { description: e.target.value })}
                          placeholder="What does this test case validate?"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={testCase.category}
                            onValueChange={(value: any) => updateTestCase(index, { category: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="edge">Edge Case</SelectItem>
                              <SelectItem value="corner">Corner Case</SelectItem>
                              <SelectItem value="performance">Performance</SelectItem>
                              <SelectItem value="error">Error Handling</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Difficulty</Label>
                          <Select
                            value={testCase.difficulty}
                            onValueChange={(value: any) => updateTestCase(index, { difficulty: value })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Points</Label>
                          <Input
                            type="number"
                            value={testCase.points}
                            onChange={(e) => updateTestCase(index, { points: parseInt(e.target.value) || 1 })}
                            className="h-8"
                            min={1}
                            max={10}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={testCase.isVisible}
                            onCheckedChange={(checked) => updateTestCase(index, { isVisible: checked })}
                          />
                          <Label className="text-xs">Visible</Label>
                        </div>
                      </div>

                      {testCase.explanation && (
                        <div>
                          <Label className="text-xs">Explanation</Label>
                          <p className="text-xs text-muted-foreground">{testCase.explanation}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Rubric Tab */}
            <TabsContent value="rubric" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Evaluation Rubric</h3>
                  <p className="text-sm text-muted-foreground">
                    Define how student submissions will be evaluated
                  </p>
                </div>
                <Button
                  onClick={generateRubric}
                  disabled={isGeneratingRubric}
                  className="flex items-center gap-2"
                >
                  {isGeneratingRubric ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      AI Generate Rubric
                    </>
                  )}
                </Button>
              </div>

              {config.rubric && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{config.rubric.totalPoints}</div>
                      <div className="text-sm text-muted-foreground">Total Points</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{config.rubric.passingScore}</div>
                      <div className="text-sm text-muted-foreground">Passing Score</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{(config.rubric?.dimensions || []).length}</div>
                      <div className="text-sm text-muted-foreground">Dimensions</div>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {(config.rubric?.dimensions || []).map((dimension, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{dimension.name}</h4>
                            <Badge>Weight: {Math.round(dimension.weight * 100)}%</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{dimension.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dimension.levels.map((level, levelIndex) => (
                              <Card key={levelIndex} className="p-3 border-l-4 border-l-primary">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{level.name}</span>
                                    <Badge variant="outline">
                                      {level.pointRange[0]}-{level.pointRange[1]} pts
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{level.description}</p>
                                  <div className="space-y-1">
                                    {level.indicators.map((indicator, indicatorIndex) => (
                                      <div key={indicatorIndex} className="flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                        <span className="text-xs">{indicator}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Code Templates</h3>
                  <p className="text-sm text-muted-foreground">
                    Provide starter templates for different approaches
                  </p>
                </div>
                <Button onClick={addTemplate} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Template
                </Button>
              </div>

              <div className="space-y-3">
                {(config.templates || []).map((template, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Input
                          value={template.name}
                          onChange={(e) => updateTemplate(index, 'name', e.target.value)}
                          placeholder="Template name"
                          className="max-w-xs"
                        />
                        <div className="flex items-center gap-2">
                          <Select
                            value={template.language}
                            onValueChange={(value) => updateTemplate(index, 'language', value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {languages.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  {lang.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTemplate(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <Textarea
                        value={template.code}
                        onChange={(e) => updateTemplate(index, 'code', e.target.value)}
                        placeholder="Template code..."
                        className="font-mono text-sm min-h-[150px]"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-6">
                {/* Hints Section */}
                <Card className="p-4">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="w-4 h-4" />
                      Hints & Tips
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-3">
                    {(config.hints || []).map((hint, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={hint}
                          onChange={(e) => {
                            const newHints = [...(config.hints || [])];
                            newHints[index] = e.target.value;
                            updateConfig({ hints: newHints });
                          }}
                          placeholder="Hint for students..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateConfig({
                              hints: (config.hints || []).filter((_, i) => i !== index)
                            });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ hints: [...(config.hints || []), ''] })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Hint
                    </Button>
                  </div>
                </Card>

                {/* Common Mistakes Section */}
                <Card className="p-4">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="w-4 h-4" />
                      Common Mistakes
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-3">
                    {(config.commonMistakes || []).map((mistake, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={mistake}
                          onChange={(e) => {
                            const newMistakes = [...(config.commonMistakes || [])];
                            newMistakes[index] = e.target.value;
                            updateConfig({ commonMistakes: newMistakes });
                          }}
                          placeholder="Common mistake to watch for..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateConfig({
                              commonMistakes: (config.commonMistakes || []).filter((_, i) => i !== index)
                            });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ commonMistakes: [...(config.commonMistakes || []), ''] })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Mistake
                    </Button>
                  </div>
                </Card>

                {/* Optimization Tips Section */}
                <Card className="p-4">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="w-4 h-4" />
                      Optimization Tips
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-3">
                    {(config.optimizationTips || []).map((tip, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={tip}
                          onChange={(e) => {
                            const newTips = [...(config.optimizationTips || [])];
                            newTips[index] = e.target.value;
                            updateConfig({ optimizationTips: newTips });
                          }}
                          placeholder="Optimization tip..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateConfig({
                              optimizationTips: (config.optimizationTips || []).filter((_, i) => i !== index)
                            });
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ optimizationTips: [...(config.optimizationTips || []), ''] })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tip
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedCodingQuestionBuilder;