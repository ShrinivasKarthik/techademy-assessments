import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Eye,
  Lightbulb,
  BarChart3
} from 'lucide-react';

interface EvaluationData {
  analysis?: {
    syntaxErrors: Array<{line: number, message: string, severity: string}>;
    logicAnalysis: any;
    codeQuality: any;
    performance: any;
    security: any;
    overallScore: number;
    summary: string;
  };
  testResults?: Array<{
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    executionTime?: number;
    confidence?: number;
    debuggingHints?: string[];
  }>;
  simulation?: any;
  uiPreview?: any;
}

interface RealTimeEvaluationPanelProps {
  data: EvaluationData;
  isLoading?: boolean;
  question: {
    points: number;
    difficulty: string;
  };
}

const RealTimeEvaluationPanel: React.FC<RealTimeEvaluationPanelProps> = ({
  data,
  isLoading = false,
  question
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate metrics
  const testsPassed = data.testResults?.filter(t => t.passed).length || 0;
  const totalTests = data.testResults?.length || 0;
  const passRate = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0;
  const overallScore = data.analysis?.overallScore || 0;
  const avgConfidence = data.testResults?.reduce((acc, t) => acc + (t.confidence || 0), 0) / (totalTests || 1);

  // Get severity counts
  const errorCounts = data.analysis?.syntaxErrors?.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse" />
            <CardTitle className="text-lg">AI Evaluation in Progress...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
            <Progress value={Math.random() * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.analysis && !data.testResults?.length) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Eye className="w-8 h-8 mx-auto mb-2" />
            <p>Run your code to see AI evaluation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <CardTitle className="text-lg">AI Evaluation</CardTitle>
          </div>
          <Badge 
            variant={overallScore >= 80 ? "default" : overallScore >= 60 ? "secondary" : "destructive"}
          >
            Score: {overallScore}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="hints">Hints</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">Tests</span>
                </div>
                <div className="text-lg font-bold">{testsPassed}/{totalTests}</div>
                <div className="text-xs text-muted-foreground">{passRate.toFixed(0)}% passed</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="text-lg font-bold">{avgConfidence.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">AI certainty</div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Score</span>
                <span>{overallScore}/100</span>
              </div>
              <Progress value={overallScore} className="h-2" />
            </div>

            {/* Summary */}
            {data.analysis?.summary && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">{data.analysis.summary}</p>
              </div>
            )}

            {/* Error Summary */}
            {Object.keys(errorCounts).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Issues Found
                </div>
                <div className="flex gap-2">
                  {Object.entries(errorCounts).map(([severity, count]) => (
                    <Badge 
                      key={severity}
                      variant={severity === 'error' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {count} {severity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests" className="space-y-3">
            {data.testResults?.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.passed ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">Test {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {result.confidence || 0}% confidence
                    </Badge>
                    {result.executionTime && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {result.executionTime}ms
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-xs space-y-1">
                  <div><strong>Input:</strong> {result.input}</div>
                  <div><strong>Expected:</strong> {result.expectedOutput}</div>
                  <div><strong>Actual:</strong> {result.actualOutput}</div>
                </div>

                {result.debuggingHints?.length && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                    <div className="text-xs font-medium text-blue-800 mb-1">Debugging Hints:</div>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {result.debuggingHints.map((hint, i) => (
                        <li key={i}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            {data.analysis && (
              <div className="space-y-4">
                {/* Quality Metrics */}
                {[
                  { key: 'codeQuality', label: 'Code Quality', icon: BarChart3 },
                  { key: 'performance', label: 'Performance', icon: TrendingUp },
                  { key: 'security', label: 'Security', icon: AlertTriangle }
                ].map(({ key, label, icon: Icon }) => {
                  const score = data.analysis?.[key]?.score || 0;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </div>
                        <span>{score}/100</span>
                      </div>
                      <Progress value={score} className="h-2" />
                      {data.analysis?.[key]?.feedback && (
                        <p className="text-xs text-muted-foreground">
                          {data.analysis[key].feedback}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Syntax Errors */}
                {data.analysis.syntaxErrors?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Syntax Issues</div>
                    {data.analysis.syntaxErrors.map((error, index) => (
                      <div 
                        key={index}
                        className="p-2 rounded bg-red-50 border border-red-200 text-sm"
                      >
                        <div className="font-medium text-red-800">Line {error.line}</div>
                        <div className="text-red-700">{error.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hints" className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm font-medium">AI Suggestions</span>
            </div>

            {/* Logic Analysis Hints */}
            {data.analysis?.logicAnalysis?.suggestions?.map((suggestion: string, index: number) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-2 border-blue-200">
                <p className="text-sm text-blue-800">{suggestion}</p>
              </div>
            ))}

            {/* Performance Hints */}
            {data.analysis?.performance?.suggestions?.map((suggestion: string, index: number) => (
              <div key={index} className="p-3 bg-green-50 rounded-lg border-l-2 border-green-200">
                <p className="text-sm text-green-800">{suggestion}</p>
              </div>
            ))}

            {/* Security Hints */}
            {data.analysis?.security?.vulnerabilities?.map((vuln: string, index: number) => (
              <div key={index} className="p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-200">
                <p className="text-sm text-yellow-800">{vuln}</p>
              </div>
            ))}

            {/* Fallback if no hints */}
            {!data.analysis?.logicAnalysis?.suggestions?.length && 
             !data.analysis?.performance?.suggestions?.length && 
             !data.analysis?.security?.vulnerabilities?.length && (
              <div className="text-center text-muted-foreground py-4">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Run your code to get AI-powered suggestions</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RealTimeEvaluationPanel;