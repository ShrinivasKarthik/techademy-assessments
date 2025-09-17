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
  onAutoSave?: () => Promise<void>;
}

const ProjectBasedQuestionBuilder: React.FC<ProjectBasedQuestionBuilderProps> = ({
  config,
  onConfigChange,
  questionId,
  questionDescription = '',
  difficulty = 'intermediate',
  onAutoSave
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('technology');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [structureReloadKey, setStructureReloadKey] = useState(0);
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

  // Auto-save when switching tabs
  const handleTabChange = async (newTab: string) => {
    if (onAutoSave && questionId && activeTab !== newTab) {
      try {
        await onAutoSave();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
    setActiveTab(newTab);
  };

  // Calculate completion status for progress indicators
  const getTabCompletionStatus = () => {
    return {
      technology: config.technology.trim() !== '',
      structure: config.projectFiles.length > 0,
      evaluation: config.testScenarios.length > 0 || config.evaluationCriteria.length > 0,
      settings: config.estimatedDuration > 0
    };
  };

  const completionStatus = getTabCompletionStatus();

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
      toast({
        title: "Analysis Starting",
        description: `Analyzing ${config.technology} with AI...`,
      });

      const { data, error } = await supabase.functions.invoke('analyze-technology', {
        body: {
          technology: config.technology,
          problemDescription: questionDescription || config.problemDescription
        }
      });

      if (error) {
        console.error('Technology analysis error:', error);
        throw new Error(error.message || 'Failed to analyze technology');
      }

      const analysis = data?.analysis;
      if (!analysis) {
        throw new Error('No analysis data returned from AI');
      }
      
      updateConfig({
        evaluationCriteria: analysis.evaluationCriteria || [],
        testScenarios: analysis.testScenarios || []
      });

      toast({
        title: "Analysis Complete!",
        description: `Successfully analyzed ${config.technology}. Generated ${analysis.evaluationCriteria?.length || 0} criteria and ${analysis.testScenarios?.length || 0} test scenarios.`,
      });

      // Auto-switch to evaluation tab if analysis is successful
      if (analysis.evaluationCriteria?.length > 0 || analysis.testScenarios?.length > 0) {
        setTimeout(() => setActiveTab('evaluation'), 1000);
      }

    } catch (error) {
      console.error('Technology analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Could not analyze technology. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateProjectStructure = async (retryCount = 0) => {
    const maxRetries = 2;
    
    if (!config.technology.trim()) {
      toast({
        title: "Technology Required",
        description: "Please specify a technology in the Technology Setup tab first",
        variant: "destructive"
      });
      setActiveTab('technology');
      return;
    }

    if (!questionId) {
      toast({
        title: "Question Not Saved",
        description: "Please save the question first to enable project structure generation",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingStructure(true);
    try {
      toast({
        title: "Generation Starting",
        description: retryCount > 0 ? 
          `Retrying project structure generation (${retryCount}/${maxRetries})...` :
          `Creating project structure for ${config.technology}...`,
      });

      // Clear existing files first if this is a retry
      if (retryCount > 0) {
        await supabase
          .from('project_files')
          .delete()
          .eq('question_id', questionId);
      }

      const { data, error } = await supabase.functions.invoke('generate-project-structure', {
        body: {
          technology: config.technology,
          problemDescription: config.problemDescription || questionDescription,
          questionId,
          retryCount
        }
      });

      if (error) {
        console.error('Project structure generation error:', error);
        throw new Error(error.message || 'Failed to generate project structure');
      }

      // Validation: Fetch and verify files were actually created
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay for DB consistency
      
      const { data: files, error: fetchError } = await supabase
        .from('project_files')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index');

      if (fetchError) {
        console.error('Fetch files error:', fetchError);
        throw new Error('Failed to fetch generated files from database');
      }

      // Validation: Check if files were actually created
      if (!files || files.length === 0) {
        throw new Error('No files were created during generation');
      }

      // Validation: Ensure we have at least one non-folder file
      const actualFiles = files.filter(f => !f.is_folder);
      if (actualFiles.length === 0) {
        throw new Error('No actual files were created, only folders');
      }

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
      // Force reload of file explorer to fetch newly created files
      setStructureReloadKey(prev => prev + 1);

      toast({
        title: "Structure Generated Successfully!",
        description: `✅ Created ${data?.filesCreated || actualFiles.length} files and ${data?.foldersCreated || files.filter(f => f.is_folder).length} folders for your ${config.technology} project`,
      });

    } catch (error) {
      console.error('Project structure generation error:', error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        toast({
          title: "Generation Failed - Retrying",
          description: `Attempt ${retryCount + 1} failed. Retrying automatically...`,
          variant: "destructive"
        });
        
        setTimeout(() => {
          generateProjectStructure(retryCount + 1);
        }, 2000);
        return;
      }

      // Final fallback: Create minimal structure
      await createFallbackStructure();
      
      toast({
        title: "Generation Failed - Using Fallback",
        description: "AI generation failed. Created a basic project structure for you to customize.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const createFallbackStructure = async () => {
    if (!questionId) return;

    try {
      const lang = config.technology.toLowerCase().includes('python') ? 'py' : 
                   config.technology.toLowerCase().includes('java') ? 'java' : 
                   config.technology.toLowerCase().includes('html') ? 'html' : 'js';
      
      const fallbackFiles = [
        {
          question_id: questionId,
          file_name: 'README.md',
          file_path: 'README.md',
          file_content: `# ${config.technology} Project\n\n## Description\n${config.problemDescription || 'Project description'}\n\n## Getting Started\n\nImplement your solution in the main file.\n`,
          file_language: 'markdown',
          is_folder: false,
          is_main_file: false,
          order_index: 0
        },
        {
          question_id: questionId,
          file_name: `main.${lang}`,
          file_path: `src/main.${lang}`,
          file_content: `// TODO: Implement your ${config.technology} solution here\n\n`,
          file_language: lang,
          is_folder: false,
          is_main_file: true,
          order_index: 1
        }
      ];

      // Create src folder
      await supabase.from('project_files').insert({
        question_id: questionId,
        file_name: 'src',
        file_path: 'src',
        file_content: '',
        file_language: '',
        is_folder: true,
        is_main_file: false,
        order_index: 0
      });

      // Create files
      const { error } = await supabase
        .from('project_files')
        .insert(fallbackFiles);

      if (error) throw error;

      // Update local state
      const { data: newFiles } = await supabase
        .from('project_files')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index');

      if (newFiles) {
        const projectFiles = newFiles.map(file => ({
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
        setStructureReloadKey(prev => prev + 1);
      }

    } catch (error) {
      console.error('Failed to create fallback structure:', error);
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
            Project-Based Question Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Overall Progress */}
          <div className="bg-muted/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Setup Progress</h3>
              <span className="text-sm text-muted-foreground">
                {Object.values(completionStatus).filter(Boolean).length}/4 steps completed
              </span>
            </div>
            <div className="flex gap-2">
              {Object.entries(completionStatus).map(([step, completed], index) => (
                <div 
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    completed ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="technology" className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${completionStatus.technology ? 'bg-green-500' : 'bg-gray-400'}`} />
                Technology Setup
              </TabsTrigger>
              <TabsTrigger value="structure" className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${completionStatus.structure ? 'bg-green-500' : 'bg-gray-400'}`} />
                Project Structure
              </TabsTrigger>
              <TabsTrigger value="evaluation" className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${completionStatus.evaluation ? 'bg-green-500' : 'bg-gray-400'}`} />
                Evaluation
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${completionStatus.settings ? 'bg-green-500' : 'bg-gray-400'}`} />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Technology Setup Tab */}
            <TabsContent value="technology" className="space-y-6">
              {/* Step Indicator */}
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <h3 className="font-semibold">Technology Setup & Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Choose your technology stack and let AI analyze the requirements for optimal project structure.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="technology">Technology / Framework / Skill *</Label>
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
                      disabled={isAnalyzing || !config.technology.trim()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                    </Button>
                  </div>
                  {!config.technology.trim() && (
                    <p className="text-sm text-destructive mt-1">
                      Technology is required for AI analysis and project generation
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter any technology, framework, or skill. AI will analyze and determine appropriate project structure.
                  </p>
                </div>

                {/* Save Draft Section - Always Visible */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-primary">Ready to Continue?</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {!questionId ? "Save as draft to unlock AI features and continue building your question" : "Continue to the next step or use AI to enhance your question"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!questionId && onAutoSave && (
                        <Button 
                          onClick={onAutoSave}
                          disabled={!config.technology.trim()}
                          className="flex items-center gap-2"
                        >
                          <Zap className="w-4 h-4" />
                          Save as Draft
                        </Button>
                      )}
                      {config.technology.trim() && (
                        <Button 
                          onClick={() => handleTabChange('structure')}
                          variant={questionId ? "default" : "outline"}
                          className="flex items-center gap-2"
                          disabled={!questionId && !config.technology.trim()}
                        >
                          Continue to Structure
                        </Button>
                      )}
                    </div>
                  </div>
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
              {/* Step Indicator */}
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <h3 className="font-semibold">Project Structure & Files</h3>
                  {config.projectFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {config.projectFiles.filter(f => !f.isFolder).length} files, {config.projectFiles.filter(f => f.isFolder).length} folders
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Create a multi-file project structure with AI assistance or manual creation.
                  {config.projectFiles.length === 0 && (
                    <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ No project files exist. Test takers will see an empty project until you generate files.
                    </span>
                  )}
                </p>
                
                {/* Status Indicators */}
                <div className="ml-11 mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${config.technology.trim() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={config.technology.trim() ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                      Technology: {config.technology.trim() ? `${config.technology}` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${questionId ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={questionId ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                      Question: {questionId ? 'Saved (AI features available)' : 'Not saved (Save to unlock AI features)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${config.projectFiles.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <span className={config.projectFiles.length > 0 ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}>
                      Project Files: {config.projectFiles.length > 0 ? `${config.projectFiles.length} items created` : 'No files generated yet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Save Draft Action */}
                {!questionId && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-destructive">Action Required</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Save the question as draft first to unlock AI project structure generation
                        </p>
                      </div>
                      {onAutoSave && (
                        <Button 
                          onClick={onAutoSave}
                          disabled={!config.technology.trim()}
                          className="flex items-center gap-2"
                        >
                          <Zap className="w-4 h-4" />
                          Save as Draft
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Project Files & Folders</h3>
                  <p className="text-sm text-muted-foreground">
                    {config.projectFiles.length > 0 ? 
                      `Generated project structure with ${config.projectFiles.filter(f => !f.isFolder).length} files` :
                      'Generate AI-powered project structure based on your technology choice'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => generateProjectStructure()}
                    disabled={isGeneratingStructure || !questionId || !config.technology.trim()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGeneratingStructure ? 'Generating...' : config.projectFiles.length > 0 ? 'Regenerate' : 'Generate with AI'}
                  </Button>
                  {completionStatus.structure && (
                    <Button 
                      onClick={() => handleTabChange('evaluation')}
                      className="flex items-center gap-2"
                    >
                      Continue to Evaluation
                    </Button>
                  )}
                </div>
              </div>

              {(!questionId || !config.technology.trim()) && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                        {!questionId ? 'Save as Draft First' : 'Prerequisites Required'}
                      </h4>
                      <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                        {!config.technology.trim() && <li>• Enter a technology in the Technology Setup tab</li>}
                        {!questionId && (
                          <li>• Click "Save as Draft" button below to enable AI file generation</li>
                        )}
                      </ul>
                      {!questionId && (
                        <div className="mt-3">
                          <Button
                            onClick={onAutoSave}
                            disabled={!onAutoSave}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Save as Draft Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {questionId ? (
                <EnhancedProjectFileExplorer
                  key={`${questionId}-${structureReloadKey}`}
                  questionId={questionId}
                  technology={config.technology || 'General'}
                  onFilesChange={(files) => {
                    console.log('Files updated:', files);
                  }}
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
              {/* Step Indicator */}
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <h3 className="font-semibold">Define Evaluation & Testing</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  Set up test scenarios and evaluation criteria to automatically assess candidate submissions.
                </p>
                
                {/* Prerequisites for AI generation */}
                <div className="ml-11 mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${config.technology.trim() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={config.technology.trim() ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                      Technology specified (for test generation)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${config.problemDescription.trim() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={config.problemDescription.trim() ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                      Problem description provided
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Test Scenarios */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Test Scenarios</Label>
                    <div className="flex gap-2">
                      <Button 
                        onClick={generateTestScenarios}
                        disabled={isGeneratingTests || !config.technology.trim() || !config.problemDescription.trim()}
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
                        Add Manual
                      </Button>
                    </div>
                  </div>

                  {(!config.technology.trim() || !config.problemDescription.trim()) && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 Fill technology and problem description for AI-powered test generation
                      </p>
                    </div>
                  )}
                  
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

              {/* Continue Section */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-primary">Ready to Finalize?</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Continue to settings to configure time limits and allowed resources
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleTabChange('settings')}
                    className="flex items-center gap-2"
                  >
                    Continue to Settings
                  </Button>
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

              {/* Completion Section */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Project-Based Question Configuration Complete</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your question is ready! You can continue creating more questions or test this one.
                    </p>
                  </div>
                </div>

                {/* Progress Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${completionStatus.technology ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <p className="text-xs text-muted-foreground">Technology</p>
                  </div>
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${completionStatus.structure ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <p className="text-xs text-muted-foreground">Structure</p>
                  </div>
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${completionStatus.evaluation ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <p className="text-xs text-muted-foreground">Evaluation</p>
                  </div>
                  <div className="text-center">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${completionStatus.settings ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <p className="text-xs text-muted-foreground">Settings</p>
                  </div>
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