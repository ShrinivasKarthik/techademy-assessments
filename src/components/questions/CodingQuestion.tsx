import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import TTSButton from '@/components/TTSButton';
import { Play, CheckCircle, XCircle } from 'lucide-react';

interface CodingQuestionProps {
  question: {
    id: string;
    title: string;
    question_text: string;
    config: {
      language?: string;
      starterCode?: string;
      testCases?: Array<{
        input: string;
        expectedOutput: string;
        description?: string;
      }>;
    };
  };
  answer?: {
    code: string;
    language: string;
    testResults?: Array<{
      passed: boolean;
      input: string;
      expectedOutput: string;
      actualOutput: string;
    }>;
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

const CodingQuestion: React.FC<CodingQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false
}) => {
  const [code, setCode] = useState(answer?.code || question.config.starterCode || '');
  const [language, setLanguage] = useState(answer?.language || question.config.language || 'javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(answer?.testResults || []);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'typescript', label: 'TypeScript' }
  ];

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onAnswerChange({
      code: newCode,
      language,
      testResults
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onAnswerChange({
      code,
      language: newLanguage,
      testResults
    });
  };

  const runCode = async () => {
    setIsRunning(true);
    
    // Simulate code execution and test running
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResults = question.config.testCases?.map(testCase => {
      // Mock test execution - in real implementation, this would call a code execution service
      const passed = Math.random() > 0.3; // 70% pass rate for demo
      return {
        passed,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: passed ? testCase.expectedOutput : 'Different output',
        description: testCase.description
      };
    }) || [];

    setTestResults(mockResults);
    onAnswerChange({
      code,
      language,
      testResults: mockResults
    });
    
    setIsRunning(false);
  };

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Coding Challenge</h3>
          <TTSButton text={question.question_text + '. ' + (question.title || '')} showLabel />
        </div>
        
        {/* Question Text */}
        {question.question_text && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm leading-relaxed">{question.question_text}</p>
          </div>
        )}
        
        {/* Language Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Language:</label>
        <Select value={language} onValueChange={handleLanguageChange} disabled={disabled}>
          <SelectTrigger className="w-48">
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

      {/* Code Editor */}
      <div>
        <label className="text-sm font-medium mb-2 block">Your Solution:</label>
        <Textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          disabled={disabled}
          className="font-mono text-sm min-h-[300px] resize-y"
          placeholder="Write your code here..."
        />
      </div>

      {/* Run Button */}
      <div className="flex justify-between items-center">
        <Button
          onClick={runCode}
          disabled={disabled || isRunning || !code.trim()}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'Running...' : 'Run & Test'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {testResults.filter(r => r.passed).length} / {testResults.length} tests passed
            </span>
          </div>
        )}
      </div>

      {/* Test Cases and Results */}
      {(question.config.testCases || testResults.length > 0) && (
        <Tabs defaultValue="test-cases" className="w-full">
          <TabsList>
            <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
            {testResults.length > 0 && (
              <TabsTrigger value="results">Results</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="test-cases" className="space-y-2">
            {question.config.testCases?.map((testCase, index) => (
              <Card key={index} className="text-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                  {testCase.description && (
                    <p className="text-xs text-muted-foreground">{testCase.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Input:</strong>
                    <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-x-auto">
                      {testCase.input}
                    </pre>
                  </div>
                  <div>
                    <strong>Expected Output:</strong>
                    <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-x-auto">
                      {testCase.expectedOutput}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          {testResults.length > 0 && (
            <TabsContent value="results" className="space-y-2">
              {testResults.map((result, index) => (
                <Card key={index} className={`text-sm border-l-4 ${result.passed ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
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
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <strong>Input:</strong>
                      <pre className="bg-muted p-2 rounded text-xs mt-1">{result.input}</pre>
                    </div>
                    <div>
                      <strong>Expected:</strong>
                      <pre className="bg-muted p-2 rounded text-xs mt-1">{result.expectedOutput}</pre>
                    </div>
                    <div>
                      <strong>Your Output:</strong>
                      <pre className={`p-2 rounded text-xs mt-1 ${result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
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

export default CodingQuestion;