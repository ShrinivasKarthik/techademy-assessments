import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  FolderTree, 
  Plus, 
  Brain, 
  Code, 
  TestTube,
  Sparkles,
  FileText,
  Folder,
  Settings,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedProjectFileExplorer from './EnhancedProjectFileExplorer';

interface ProjectFile {
  id: string;
  fileName: string;
  filePath: string;
  fileContent: string;
  fileLanguage: string;
  isFolder: boolean;
  isMainFile: boolean;
  orderIndex: number;
}

interface ProjectBasedQuestionConfig {
  technology: string;
  problemDescription: string;
  projectFiles: ProjectFile[];
  testScenarios: string[];
  evaluationCriteria: string[];
  estimatedDuration: number;
  allowedResources: string[];
}

interface ProjectBasedQuestionBuilderProps {
  config: ProjectBasedQuestionConfig;
  onConfigChange: (config: ProjectBasedQuestionConfig) => void;
  questionId?: string;
  questionDescription?: string;
  difficulty?: string;
}

const ProjectBasedQuestionBuilder: React.FC<ProjectBasedQuestionBuilderProps> = ({
  config,
  onConfigChange,
  questionId,
  questionDescription = '',
  difficulty = 'intermediate'
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('technology');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [technologySuggestions] = useState([
    'React TypeScript',
    'Vue.js with TypeScript',
    'Angular with TypeScript',
    'Node.js Express API',
    'Django REST Framework',
    'Flask Python API',
    'Spring Boot Java',
    'Laravel PHP',
    'ASP.NET Core C#',
    'React Native Mobile',
    'Flutter Dart',
    'Unity C# Game Development',
    'Docker Containerization',
    'Terraform Infrastructure',
    'AWS Lambda Serverless',
    'Kubernetes Deployment'
  ]);

  const updateConfig = (updates: Partial<ProjectBasedQuestionConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const analyzeTechnology = async () => {
    if (!config.technology.trim()) {
      toast({
        title: "Technology Required",
        description: "Please enter a technology or skill to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-technology', {
        body: {
          technology: config.technology,
          problemDescription: questionDescription
        }
      });

      if (error) throw error;

      const analysis = data.analysis;
      
      updateConfig({
        evaluationCriteria: analysis.evaluationCriteria,
        testScenarios: analysis.testScenarios
      });

      toast({
        title: "Technology Analyzed",
        description: `Successfully analyzed ${config.technology} and extracted evaluation criteria`,
      });

    } catch (error) {
      console.error('Technology analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze technology. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateProjectStructure = async () => {
    if (!config.technology.trim() || !questionId) {
      toast({
        title: "Missing Information",
        description: "Technology and saved question required to generate project structure",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingStructure(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-project-structure', {
        body: {
          technology: config.technology,
          problemDescription: config.problemDescription || questionDescription,
          questionId
        }
      });

      if (error) throw error;

      // Fetch the generated files from database
      const { data: files, error: fetchError } = await supabase
        .from('project_files')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index');

      if (fetchError) throw fetchError;

      const projectFiles = files.map(file => ({
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileContent: file.file_content,
        fileLanguage: file.file_language,
        isFolder: file.is_folder,
        isMainFile: file.is_main_file,
        orderIndex: file.order_index
      }));

      updateConfig({ projectFiles });

      toast({
        title: "Project Structure Generated",
        description: `Created ${data.filesCreated} files and ${data.foldersCreated} folders`,
      });

    } catch (error) {
      console.error('Project structure generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate project structure. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const generateTestScenarios = async () => {
    if (!config.technology.trim() || !config.problemDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Technology and problem description required to generate test scenarios",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTests(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-cases', {
        body: {
          problemDescription: config.problemDescription,
          language: config.technology,
          difficulty,
          existingTestCases: []
        }
      });

      if (error) throw error;

      const testCases = data.testCases || [];
      const scenarios = testCases.map((tc: any) => tc.description || tc.input);
      
      updateConfig({
        testScenarios: [...config.testScenarios, ...scenarios]
      });

      toast({
        title: "Test Scenarios Generated",
        description: `Generated ${scenarios.length} test scenarios`,
      });

    } catch (error) {
      console.error('Test scenarios generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate test scenarios. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTests(false);
    }
  };

  const addTestScenario = () => {
    updateConfig({
      testScenarios: [...config.testScenarios, '']
    });
  };

  const updateTestScenario = (index: number, value: string) => {
    const newScenarios = [...config.testScenarios];
    newScenarios[index] = value;
    updateConfig({ testScenarios: newScenarios });
  };

  const removeTestScenario = (index: number) => {
    updateConfig({
      testScenarios: config.testScenarios.filter((_, i) => i !== index)
    });
  };

  const addEvaluationCriterion = () => {
    updateConfig({
      evaluationCriteria: [...config.evaluationCriteria, '']
    });
  };

  const updateEvaluationCriterion = (index: number, value: string) => {
    const newCriteria = [...config.evaluationCriteria];
    newCriteria[index] = value;
    updateConfig({ evaluationCriteria: newCriteria });
  };

  const removeEvaluationCriterion = (index: number) => {
    updateConfig({
      evaluationCriteria: config.evaluationCriteria.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Project-Based Assessment Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="technology">Technology Setup</TabsTrigger>
              <TabsTrigger value="structure">Project Structure</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Technology Setup Tab */}
            <TabsContent value="technology" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="technology">Technology / Framework / Skill</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="technology"
                      value={config.technology}
                      onChange={(e) => updateConfig({ technology: e.target.value })}
                      placeholder="Enter any technology (e.g., React TypeScript, Django REST API, Unity C#)"
                      className="flex-1"
                    />
                    <Button 
                      onClick={analyzeTechnology}
                      disabled={isAnalyzing}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter any technology, framework, or skill. AI will analyze and determine appropriate project structure.
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Popular Technologies</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {technologySuggestions.map((tech) => (
                      <Badge
                        key={tech}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => updateConfig({ technology: tech })}
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="problemDescription">Problem Description</Label>
                  <Textarea
                    id="problemDescription"
                    value={config.problemDescription}
                    onChange={(e) => updateConfig({ problemDescription: e.target.value })}
                    placeholder="Describe the project requirements and what candidates should build..."
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This helps AI generate appropriate project structure and test scenarios.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Project Structure Tab */}
            <TabsContent value="structure" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Project Files & Folders</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-generated project structure based on your technology choice
                  </p>
                </div>
                <Button 
                  onClick={generateProjectStructure}
                  disabled={isGeneratingStructure || !questionId}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingStructure ? 'Generating...' : 'Generate Structure'}
                </Button>
              </div>

              {questionId ? (
                <ProjectFileExplorer 
                  questionId={questionId}
                  technology={config.technology}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Save the question first to enable project structure generation</p>
                </div>
              )}
            </TabsContent>

            {/* Evaluation Tab */}
            <TabsContent value="evaluation" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Test Scenarios */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Test Scenarios</Label>
                    <div className="flex gap-2">
                      <Button 
                        onClick={generateTestScenarios}
                        disabled={isGeneratingTests}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        {isGeneratingTests ? 'Generating...' : 'AI Generate'}
                      </Button>
                      <Button 
                        onClick={addTestScenario}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {config.testScenarios.map((scenario, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={scenario}
                          onChange={(e) => updateTestScenario(index, e.target.value)}
                          placeholder={`Test scenario ${index + 1}...`}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => removeTestScenario(index)}
                          variant="outline"
                          size="sm"
                          className="mt-1"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evaluation Criteria */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Evaluation Criteria</Label>
                    <Button 
                      onClick={addEvaluationCriterion}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {config.evaluationCriteria.map((criterion, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={criterion}
                          onChange={(e) => updateEvaluationCriterion(index, e.target.value)}
                          placeholder={`Evaluation criterion ${index + 1}...`}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => removeEvaluationCriterion(index)}
                          variant="outline"
                          size="sm"
                          className="mt-1"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
                  <Input
                    id="estimatedDuration"
                    type="number"
                    value={config.estimatedDuration}
                    onChange={(e) => updateConfig({ estimatedDuration: parseInt(e.target.value) || 60 })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="allowedResources">Allowed Resources</Label>
                  <Textarea
                    id="allowedResources"
                    value={config.allowedResources.join('\n')}
                    onChange={(e) => updateConfig({ allowedResources: e.target.value.split('\n').filter(r => r.trim()) })}
                    placeholder="Documentation sites&#10;Stack Overflow&#10;Official tutorials"
                    rows={3}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    One resource per line
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectBasedQuestionBuilder;