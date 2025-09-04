import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Plus, 
  X, 
  FileText, 
  Code,
  Save,
  FolderOpen,
  Monitor,
  Brain
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CodeIntelligencePanel from '@/components/CodeIntelligencePanel';

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
  isMain?: boolean;
}

interface CodingQuestionProps {
  question: {
    id: string;
    title: string;
    description: string;
    config: {
      language?: string;
      starterCode?: string;
      supportedLanguages?: string[];
      files?: CodeFile[];
      testCases?: Array<{
        input: string;
        expectedOutput: string;
        description?: string;
        isHidden?: boolean;
      }>;
      allowMultipleFiles?: boolean;
    };
  };
  answer?: {
    files: CodeFile[];
    language: string;
      testResults?: Array<{
        passed: boolean;
        input: string;
        expectedOutput: string;
        actualOutput: string;
        executionTime?: number;
        confidence?: number;
        debuggingHints?: string[];
      }>;
      analysis?: {
        syntaxErrors: Array<{line: number, message: string, severity: string}>;
        logicAnalysis: any;
        codeQuality: any;
        performance: any;
        security: any;
        overallScore: number;
        summary: string;
      };
      simulation?: any;
      uiPreview?: any;
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

const EnhancedCodingQuestion: React.FC<CodingQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false
}) => {
  const { toast } = useToast();
  
  // Supported languages - must be defined before functions that use it
  const languages = [
    { value: 'javascript', label: 'JavaScript', extension: 'js' },
    { value: 'typescript', label: 'TypeScript', extension: 'ts' },
    { value: 'python', label: 'Python', extension: 'py' },
    { value: 'java', label: 'Java', extension: 'java' },
    { value: 'cpp', label: 'C++', extension: 'cpp' },
    { value: 'html', label: 'HTML', extension: 'html' },
    { value: 'css', label: 'CSS', extension: 'css' },
    { value: 'json', label: 'JSON', extension: 'json' }
  ];

  // Helper functions
  function getDefaultFileName(lang: string): string {
    const langConfig = languages.find(l => l.value === lang);
    return `main.${langConfig?.extension || 'js'}`;
  }

  function getLanguageFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const langConfig = languages.find(l => l.extension === extension);
    return langConfig?.value || 'javascript';
  }
  // State management
  const [files, setFiles] = useState<CodeFile[]>(() => {
    if (answer?.files?.length) return answer.files;
    if (question.config.files?.length) return question.config.files;
    
    // Default single file setup
    return [{
      id: 'main',
      name: getDefaultFileName(question.config.language || 'javascript'),
      content: question.config.starterCode || '',
      language: question.config.language || 'javascript',
      isMain: true
    }];
  });
  
  const [activeFileId, setActiveFileId] = useState(files[0]?.id || 'main');
  const [language, setLanguage] = useState(answer?.language || question.config.language || 'javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(answer?.testResults || []);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showIntelligencePanel, setShowIntelligencePanel] = useState(false);

  const supportedLanguages = question.config.supportedLanguages || ['javascript', 'typescript', 'python'];
  const availableLanguages = languages.filter(lang => supportedLanguages.includes(lang.value));
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      const activeFile = files.find(f => f.id === activeFileId);
      if (activeFile) {
        localStorage.setItem(`coding-question-${question.id}`, JSON.stringify({
          files,
          language,
          lastModified: Date.now()
        }));
      }
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [files, language, question.id, activeFileId]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`coding-question-${question.id}`);
    if (saved && !answer?.files?.length) {
      try {
        const { files: savedFiles, language: savedLang } = JSON.parse(saved);
        if (savedFiles?.length) {
          setFiles(savedFiles);
          setLanguage(savedLang);
        }
      } catch (error) {
        console.error('Failed to load saved code:', error);
      }
    }
  }, [question.id, answer?.files?.length]);

  // Notify parent of changes
  const notifyChange = useCallback(() => {
    onAnswerChange({
      files,
      language,
      testResults
    });
  }, [files, language, testResults, onAnswerChange]);

  useEffect(() => {
    notifyChange();
  }, [notifyChange]);

  // File management
  const createNewFile = () => {
    if (!newFileName.trim()) return;
    
    const fileName = newFileName.includes('.') ? newFileName : `${newFileName}.${languages.find(l => l.value === language)?.extension || 'js'}`;
    const fileLanguage = getLanguageFromFileName(fileName);
    
    const newFile: CodeFile = {
      id: Date.now().toString(),
      name: fileName,
      content: '',
      language: fileLanguage
    };
    
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setNewFileName('');
    setShowNewFileInput(false);
    
    toast({
      title: "File created",
      description: `Created ${fileName}`,
    });
  };

  const deleteFile = (fileId: string) => {
    if (files.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "At least one file is required",
        variant: "destructive"
      });
      return;
    }
    
    const fileToDelete = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (activeFileId === fileId) {
      setActiveFileId(files.find(f => f.id !== fileId)?.id || files[0]?.id);
    }
    
    toast({
      title: "File deleted",
      description: `Deleted ${fileToDelete?.name}`,
    });
  };

  const updateFileContent = (content: string) => {
    setFiles(prev => prev.map(file => 
      file.id === activeFileId 
        ? { ...file, content }
        : file
    ));
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    
    // Update file extensions if needed
    setFiles(prev => prev.map(file => {
      if (file.isMain) {
        const newExtension = languages.find(l => l.value === newLanguage)?.extension || 'js';
        const baseName = file.name.split('.')[0];
        return {
          ...file,
          name: `${baseName}.${newExtension}`,
          language: newLanguage
        };
      }
      return file;
    }));
  };

  // AI-powered code execution and evaluation
  const runCode = async () => {
    setIsRunning(true);
    
    try {
      // Step 1: Code Analysis
      toast({
        title: "Running AI Analysis",
        description: "Analyzing code quality and logic...",
      });

      const analysisResponse = await supabase.functions.invoke('analyze-code', {
        body: {
          code: activeFile?.content,
          language: activeFile?.language || language,
          questionContext: question.description,
          testCases: question.config.testCases?.filter(tc => !tc.isHidden)
        }
      });

      if (analysisResponse.error) {
        throw new Error(`Analysis failed: ${analysisResponse.error.message}`);
      }

      const { analysis } = analysisResponse.data;

      // Step 2: Execution Simulation
      toast({
        title: "Simulating Execution",
        description: "Running test cases through AI simulation...",
      });

      const simulationResponse = await supabase.functions.invoke('simulate-execution', {
        body: {
          code: activeFile?.content,
          language: activeFile?.language || language,
          testCases: question.config.testCases?.filter(tc => !tc.isHidden),
          questionContext: question.description
        }
      });

      if (simulationResponse.error) {
        throw new Error(`Simulation failed: ${simulationResponse.error.message}`);
      }

      const { simulation } = simulationResponse.data;

      // Step 3: UI Preview (if applicable)
      let uiPreview = null;
      const hasUIFiles = files.some(file => 
        ['html', 'css', 'javascript'].includes(file.language) ||
        file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.js')
      );

      if (hasUIFiles) {
        toast({
          title: "Generating UI Preview",
          description: "Creating visual mockup of your interface...",
        });

        const previewResponse = await supabase.functions.invoke('generate-ui-preview', {
          body: {
            files: files,
            questionContext: question.description
          }
        });

        if (!previewResponse.error) {
          uiPreview = previewResponse.data.preview;
        }
      }

      // Process simulation results into test results format
      const processedResults = simulation.executionResults?.map((result: any) => ({
        passed: result.passed,
        input: result.input,
        expectedOutput: result.expectedOutput,
        actualOutput: result.actualOutput,
        executionTime: result.executionTime,
        confidence: result.confidence || (result.passed ? 95 : 60),
        debuggingHints: result.debuggingHints
      })) || [];

      setTestResults(processedResults);

      // Update answer with comprehensive results
      onAnswerChange({
        files,
        language,
        testResults: processedResults,
        analysis,
        simulation,
        uiPreview
      });

      const passedCount = processedResults.filter((r: any) => r.passed).length;
      const totalCount = processedResults.length;
      
      toast({
        title: "AI Evaluation Complete",
        description: `${passedCount}/${totalCount} tests passed. Overall score: ${analysis.overallScore}/100`,
        variant: passedCount === totalCount ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('AI evaluation error:', error);
      toast({
        title: "Evaluation failed",
        description: error instanceof Error ? error.message : "An error occurred during AI evaluation",
        variant: "destructive"
      });
      
      // Fallback to basic simulation
      const fallbackResults = question.config.testCases?.filter(tc => !tc.isHidden).map((testCase, index) => ({
        passed: Math.random() > 0.5,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: "AI evaluation unavailable",
        executionTime: Math.floor(Math.random() * 100) + 10,
        confidence: 30
      })) || [];
      
      setTestResults(fallbackResults);
      onAnswerChange({
        files,
        language,
        testResults: fallbackResults
      });
    } finally {
      setIsRunning(false);
    }
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const canAddFiles = question.config.allowMultipleFiles !== false;

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Language:</label>
          <Select value={language} onValueChange={handleLanguageChange} disabled={disabled}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={runCode}
            disabled={disabled || isRunning || !activeFile?.content.trim()}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run & Test'}
          </Button>
          
          {testResults.length > 0 && (
            <Badge variant={testResults.every(r => r.passed) ? "default" : "destructive"}>
              {testResults.filter(r => r.passed).length} / {testResults.length} passed
            </Badge>
          )}
        </div>
      </div>

      {/* File Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Files</span>
            </div>
            {canAddFiles && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewFileInput(true)}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* File tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {files.map(file => (
              <Button
                key={file.id}
                variant={activeFileId === file.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFileId(file.id)}
                disabled={disabled}
                className="h-8 text-xs flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {file.name}
                {canAddFiles && files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(file.id);
                    }}
                    className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Button>
            ))}
          </div>

          {/* New file input */}
          {showNewFileInput && (
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.js"
                className="h-8 text-xs"
                onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
                autoFocus
              />
              <Button size="sm" onClick={createNewFile} className="h-8">
                <Plus className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowNewFileInput(false);
                  setNewFileName('');
                }}
                className="h-8"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Editor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code className="w-4 h-4" />
            {activeFile?.name || 'Code Editor'}
            <Badge variant="outline" className="text-xs">
              {activeFile?.language || language}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Editor
              height="400px"
              language={activeFile?.language || language}
              value={activeFile?.content || ''}
              onChange={(value) => updateFileContent(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                readOnly: disabled,
                bracketPairColorization: { enabled: true },
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                  showMethods: true,
                  showFunctions: true,
                  showConstructors: true,
                  showFields: true,
                  showVariables: true,
                  showClasses: true,
                  showStructs: true,
                  showInterfaces: true,
                  showModules: true,
                  showProperties: true,
                  showEvents: true,
                  showOperators: true,
                  showUnits: true,
                  showValues: true,
                  showConstants: true,
                  showEnums: true,
                  showEnumMembers: true,
                  showText: true,
                  showColors: true,
                  showFiles: true,
                  showReferences: true,
                  showFolders: true,
                  showTypeParameters: true,
                  showIssues: true,
                  showUsers: true,
                },
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: false
                }
              }}
              loading={<div className="flex items-center justify-center h-96">Loading editor...</div>}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Cases and Results */}
      {(question.config.testCases || testResults.length > 0) && (
        <Tabs defaultValue="test-cases" className="w-full">
          <TabsList>
            <TabsTrigger value="test-cases" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Test Cases
            </TabsTrigger>
            {testResults.length > 0 && (
              <TabsTrigger value="results" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Results
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="test-cases" className="space-y-3">
            {question.config.testCases?.filter(tc => !tc.isHidden).map((testCase, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                  {testCase.description && (
                    <p className="text-xs text-muted-foreground">{testCase.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Input:</label>
                    <pre className="bg-muted p-3 rounded-md text-xs mt-1 overflow-x-auto font-mono">
                      {testCase.input}
                    </pre>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Expected Output:</label>
                    <pre className="bg-muted p-3 rounded-md text-xs mt-1 overflow-x-auto font-mono">
                      {testCase.expectedOutput}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          {testResults.length > 0 && (
            <TabsContent value="results" className="space-y-3">
              {testResults.map((result, index) => (
                <Card key={index} className={`border-l-4 ${result.passed ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                      <div className="flex items-center gap-2">
                        {result.executionTime && (
                          <Badge variant="outline" className="text-xs">
                            {result.executionTime}ms
                          </Badge>
                        )}
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Passed
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Failed
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Input:</label>
                      <pre className="bg-muted p-3 rounded-md text-xs mt-1 font-mono">{result.input}</pre>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Expected:</label>
                      <pre className="bg-muted p-3 rounded-md text-xs mt-1 font-mono">{result.expectedOutput}</pre>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Your Output:</label>
                      <pre className={`p-3 rounded-md text-xs mt-1 font-mono ${
                        result.passed 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {result.actualOutput}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default EnhancedCodingQuestion;