import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  FolderTree, 
  Play, 
  Save,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  Code,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  BookOpen,
  ListChecks,
  Shield,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Editor from '@monaco-editor/react';
import TTSButton from './TTSButton';

interface ProjectFile {
  id: string;
  fileName: string;
  filePath: string;
  fileContent: string;
  fileLanguage: string;
  isFolder: boolean;
  isMainFile: boolean;
  orderIndex: number;
  parentFolderId?: string;
}

interface ProjectBasedQuestionProps {
  question: {
    id: string;
    title: string;
    question_text: string;
    config: {
      technology?: string;
      problemDescription?: string;
      testScenarios?: string[];
      evaluationCriteria?: string[];
      estimatedDuration?: number;
      allowedResources?: string[];
    };
  };
  answer?: {
    files: ProjectFile[];
    completedScenarios: string[];
    timeSpent: number;
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
  instanceId?: string;
  shareToken?: string;
}

const ProjectBasedQuestion: React.FC<ProjectBasedQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false,
  instanceId,
  shareToken
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [completedScenarios, setCompletedScenarios] = useState<string[]>(answer?.completedScenarios || []);
  const [timeSpent, setTimeSpent] = useState(answer?.timeSpent || 0);
  const [startTime] = useState(Date.now());
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Panel state management
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'explorer'>('problem');
  const [collapsedSections, setCollapsedSections] = useState({
    testScenarios: false,
    evaluationCriteria: true,
    allowedResources: true
  });

  useEffect(() => {
    fetchProjectFiles();
  }, [question.id]);

  useEffect(() => {
    // Update time spent every minute
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
      setTimeSpent(elapsed);
    }, 60000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    // Auto-save answer changes
    const timeoutId = setTimeout(() => {
      onAnswerChange({
        files,
        completedScenarios,
        timeSpent
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [files, completedScenarios, timeSpent, onAnswerChange]);

  const fetchProjectFiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-project-structure', {
        body: {
          questionId: question.id,
          instanceId,
          shareToken
        }
      });

      if (error) throw error;

      const rows = data?.files || [];

      const projectFiles = rows.map((file: any) => ({
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileContent: file.file_content,
        fileLanguage: file.file_language,
        isFolder: file.is_folder,
        isMainFile: file.is_main_file,
        orderIndex: file.order_index,
        parentFolderId: file.parent_folder_id ?? undefined
      }));

      setFiles(projectFiles);

      // Auto-expand root folders and select main file
      const rootFolders = projectFiles
        .filter(f => f.isFolder && !f.parentFolderId)
        .map(f => f.id);
      setExpandedFolders(new Set(rootFolders));

      const mainFile = projectFiles.find(f => f.isMainFile && !f.isFolder);
      if (mainFile) {
        setSelectedFile(mainFile);
      }

    } catch (error) {
      console.error('Error fetching project files:', error);
      toast({
        title: "Failed to load project",
        description: "Could not load project files",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFileContent = (fileId: string, content: string) => {
    if (disabled) return;

    const updatedFiles = files.map(f => 
      f.id === fileId ? { ...f, fileContent: content } : f
    );
    setFiles(updatedFiles);

    if (selectedFile?.id === fileId) {
      setSelectedFile({ ...selectedFile, fileContent: content });
    }
  };

  const toggleScenarioCompletion = (scenario: string) => {
    if (disabled) return;

    const updated = completedScenarios.includes(scenario)
      ? completedScenarios.filter(s => s !== scenario)
      : [...completedScenarios, scenario];
    
    setCompletedScenarios(updated);
  };

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      // This would integrate with your existing AI evaluation system
      const { data, error } = await supabase.functions.invoke('analyze-code', {
        body: {
          code: selectedFile?.fileContent || '',
          language: question.config.technology || 'javascript',
          questionContext: question.question_text,
          testCases: question.config.testScenarios || []
        }
      });

      if (error) throw error;

      toast({
        title: "Evaluation Complete",
        description: "Your project has been analyzed",
      });

    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: "Evaluation Failed",
        description: "Could not evaluate your project",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.isFolder) {
      return expandedFolders.has(file.id) ? 
        <FolderOpen className="w-4 h-4 text-blue-500" /> : 
        <Folder className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const renderFileTree = (parentId: string | null = null, level = 0) => {
    const isRoot = parentId == null;
    const items = files
      .filter(f => isRoot ? f.parentFolderId == null : f.parentFolderId === parentId)
      .sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.orderIndex - b.orderIndex;
      });

    return items.map(file => (
      <div key={file.id} style={{ marginLeft: `${level * 20}px` }}>
        <div 
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent ${
            selectedFile?.id === file.id ? 'bg-accent' : ''
          }`}
          onClick={() => {
            if (file.isFolder) {
              toggleFolder(file.id);
            } else {
              setSelectedFile(file);
            }
          }}
        >
          {file.isFolder && (
            expandedFolders.has(file.id) ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
          )}
          {getFileIcon(file)}
          <span className="flex-1 text-sm">{file.fileName}</span>
          {file.isMainFile && <Badge variant="secondary" className="text-xs">Main</Badge>}
        </div>
        {file.isFolder && expandedFolders.has(file.id) && renderFileTree(file.id, level + 1)}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FolderTree className="w-5 h-5" />
            Project-Based Assessment
          </h3>
          <TTSButton text={question.question_text + '. ' + (question.title || '')} showLabel />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {timeSpent} minutes
          </div>
          {question.config.technology && (
            <Badge variant="outline">{question.config.technology}</Badge>
          )}
        </div>
      </div>

      {/* Three-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Problem Statement & File Explorer */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <div className="h-full flex flex-col">
            <Tabs value={activeLeftTab} onValueChange={(value) => setActiveLeftTab(value as 'problem' | 'explorer')} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="problem" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Problem
                </TabsTrigger>
                <TabsTrigger value="explorer" className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Files
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="problem" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-4">
                  <div className="space-y-4">
                    {question.question_text && (
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm leading-relaxed">{question.question_text}</p>
                        {question.config.problemDescription && (
                          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold mb-2 text-sm">Project Requirements:</h4>
                            <p className="text-sm leading-relaxed">{question.config.problemDescription}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="explorer" className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-4">
                  {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <div className="space-y-2">
                        <p className="font-medium text-sm">No project files available</p>
                        <p className="text-xs">This question may not have been set up properly.</p>
                        <p className="text-xs">Please contact your instructor.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {renderFileTree(null)}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Center Panel - Code Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedFile ? selectedFile.fileName : 'Select a file'}
                </span>
                {selectedFile && (
                  <Badge variant="outline" className="text-xs">
                    {selectedFile.fileLanguage}
                  </Badge>
                )}
              </div>
              <Button 
                onClick={runEvaluation}
                disabled={disabled || isEvaluating || !selectedFile}
                variant="outline"
                size="sm"
              >
                {isEvaluating ? 'Evaluating...' : 'Test Code'}
              </Button>
            </div>
            
            <div className="flex-1">
              {selectedFile ? (
                <Editor
                  height="100%"
                  language={selectedFile.fileLanguage}
                  value={selectedFile.fileContent}
                  onChange={(value) => updateFileContent(selectedFile.id, value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: disabled
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Select a file to start coding</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Right Panel - Test Scenarios & Assessment Guide */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Test Scenarios */}
            {question.config.testScenarios && question.config.testScenarios.length > 0 && (
              <Collapsible open={!collapsedSections.testScenarios} onOpenChange={() => toggleSection('testScenarios')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span className="font-medium text-sm">Test Scenarios</span>
                    <Badge variant="secondary" className="text-xs">
                      {completedScenarios.length}/{question.config.testScenarios.length}
                    </Badge>
                  </div>
                  {collapsedSections.testScenarios ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {question.config.testScenarios.map((scenario, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 border rounded text-xs">
                      <Button
                        onClick={() => toggleScenarioCompletion(scenario)}
                        disabled={disabled}
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 mt-0.5"
                      >
                        {completedScenarios.includes(scenario) ? 
                          <CheckCircle className="w-4 h-4 text-green-500" /> :
                          <div className="w-4 h-4 border border-muted-foreground rounded-full" />
                        }
                      </Button>
                      <p className="flex-1 leading-relaxed">{scenario}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Evaluation Criteria */}
            {question.config.evaluationCriteria && question.config.evaluationCriteria.length > 0 && (
              <Collapsible open={!collapsedSections.evaluationCriteria} onOpenChange={() => toggleSection('evaluationCriteria')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    <span className="font-medium text-sm">Evaluation Criteria</span>
                  </div>
                  {collapsedSections.evaluationCriteria ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {question.config.evaluationCriteria.map((criterion, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-muted/20 rounded">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                      <p className="text-xs leading-relaxed">{criterion}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Allowed Resources */}
            {question.config.allowedResources && question.config.allowedResources.length > 0 && (
              <Collapsible open={!collapsedSections.allowedResources} onOpenChange={() => toggleSection('allowedResources')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium text-sm">Allowed Resources</span>
                  </div>
                  {collapsedSections.allowedResources ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {question.config.allowedResources.map((resource, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-xs">{resource}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default ProjectBasedQuestion;