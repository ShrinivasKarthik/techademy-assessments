import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TestResult {
  input: string;
  output: string;
  expected: string;
  passed: boolean;
  executionTime: number;
}

export interface ExecutionResult {
  success: boolean;
  executionTime: number;
  testResults: TestResult[];
  errors: string[];
  warnings: string[];
  codeQuality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  performance: {
    timeComplexity: string;
    spaceComplexity: string;
    bottlenecks: string[];
  };
  debugging: {
    trace: string[];
    variables: any;
    breakpoints: any[];
  };
  hints: string[];
  improvements: string[];
  interactiveElements: {
    debuggerState: any;
    visualizations: any[];
  };
  codeIntelligence?: {
    syntaxHighlighting: any;
    autoComplete: any;
    refactoringSuggestions: any;
  };
  interactiveDebugger?: any;
  optimizationSuggestions?: any;
}

export interface ExecutionOptions {
  debugMode?: boolean;
  performanceAnalysis?: boolean;
  executionMode?: 'standard' | 'step-by-step' | 'interactive';
  enableHints?: boolean;
  realTimeAnalysis?: boolean;
}

export const useEnhancedCodeExecution = () => {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);

  const executeCode = useCallback(async (
    code: string,
    language: string,
    testCases: any[] = [],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> => {
    setIsExecuting(true);

    try {
      console.log('Executing enhanced code:', { language, options });

      const { data, error } = await supabase.functions.invoke('enhanced-code-execution', {
        body: {
          code,
          language,
          testCases,
          executionMode: options.executionMode || 'standard',
          debugMode: options.debugMode || false,
          performanceAnalysis: options.performanceAnalysis || false,
          enableHints: options.enableHints !== false,
          realTimeAnalysis: options.realTimeAnalysis || false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result: ExecutionResult = data;
      
      // Add to execution history
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 executions

      // Show execution summary
      const passedTests = result.testResults?.filter(t => t.passed).length || 0;
      const totalTests = result.testResults?.length || 0;
      
      if (result.success && passedTests === totalTests) {
        toast({
          title: "Code Executed Successfully",
          description: `All ${totalTests} test cases passed. Quality score: ${result.codeQuality?.score || 'N/A'}%`
        });
      } else if (result.success) {
        toast({
          title: "Partial Success",
          description: `${passedTests}/${totalTests} test cases passed`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Execution Failed",
          description: result.errors?.[0] || "Code execution encountered errors",
          variant: "destructive"
        });
      }

      return result;

    } catch (error: any) {
      console.error('Enhanced code execution error:', error);
      
      const errorResult: ExecutionResult = {
        success: false,
        executionTime: 0,
        testResults: [],
        errors: [error.message],
        warnings: [],
        codeQuality: { score: 0, issues: [error.message], suggestions: [] },
        performance: { timeComplexity: 'Unknown', spaceComplexity: 'Unknown', bottlenecks: [] },
        debugging: { trace: [], variables: {}, breakpoints: [] },
        hints: ['Fix the execution error before proceeding'],
        improvements: [],
        interactiveElements: { debuggerState: {}, visualizations: [] }
      };

      toast({
        title: "Execution Error",
        description: error.message,
        variant: "destructive"
      });

      return errorResult;
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  const analyzeCodeQuality = useCallback(async (code: string, language: string) => {
    try {
      const result = await executeCode(code, language, [], { 
        executionMode: 'standard',
        performanceAnalysis: true,
        enableHints: true
      });
      
      return result.codeQuality;
    } catch (error) {
      console.error('Code quality analysis error:', error);
      return { score: 0, issues: ['Analysis failed'], suggestions: [] };
    }
  }, [executeCode]);

  const getOptimizationSuggestions = useCallback(async (code: string, language: string) => {
    try {
      const result = await executeCode(code, language, [], { 
        performanceAnalysis: true 
      });
      
      return result.optimizationSuggestions || result.improvements;
    } catch (error) {
      console.error('Optimization analysis error:', error);
      return [];
    }
  }, [executeCode]);

  const debugStepByStep = useCallback(async (code: string, language: string, testCases: any[] = []) => {
    try {
      const result = await executeCode(code, language, testCases, {
        executionMode: 'step-by-step',
        debugMode: true,
        realTimeAnalysis: true
      });
      
      return result.debugging;
    } catch (error) {
      console.error('Step-by-step debugging error:', error);
      return { trace: [], variables: {}, breakpoints: [] };
    }
  }, [executeCode]);

  const getCodeIntelligence = useCallback(async (code: string, language: string) => {
    try {
      const result = await executeCode(code, language, [], { 
        executionMode: 'interactive',
        realTimeAnalysis: true 
      });
      
      return result.codeIntelligence;
    } catch (error) {
      console.error('Code intelligence error:', error);
      return null;
    }
  }, [executeCode]);

  const validateSyntax = useCallback(async (code: string, language: string) => {
    try {
      const result = await executeCode(code, language, [], { 
        executionMode: 'standard' 
      });
      
      return {
        isValid: result.success && result.errors.length === 0,
        errors: result.errors,
        warnings: result.warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }, [executeCode]);

  const simulateExecution = useCallback(async (
    code: string, 
    language: string, 
    inputs: any[]
  ): Promise<any[]> => {
    try {
      const testCases = inputs.map((input, index) => ({
        id: `sim_${index}`,
        input: JSON.stringify(input),
        expectedOutput: '', // No expected output for simulation
        description: `Simulation ${index + 1}`
      }));

      const result = await executeCode(code, language, testCases, {
        executionMode: 'interactive'
      });

      return result.testResults.map(tr => {
        try {
          return JSON.parse(tr.output);
        } catch {
          return tr.output;
        }
      });
    } catch (error) {
      console.error('Execution simulation error:', error);
      return [];
    }
  }, [executeCode]);

  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  return {
    executeCode,
    analyzeCodeQuality,
    getOptimizationSuggestions,
    debugStepByStep,
    getCodeIntelligence,
    validateSyntax,
    simulateExecution,
    clearHistory,
    isExecuting,
    executionHistory
  };
};