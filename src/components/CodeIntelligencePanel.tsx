import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  FileSearch,
  Brain,
  TrendingUp,
  Zap,
  Target,
  XCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlagiarismResult {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suspiciousPatterns: Array<{
    type: string;
    confidence: number;
    description: string;
    codeSegment: string;
    lineNumbers: [number, number];
  }>;
  styleAnalysis: {
    consistencyScore: number;
    codingStyle: string;
    inconsistencies: string[];
  };
  similarityIndicators: {
    commonPatterns: string[];
    suspiciousStructures: string[];
    variableNamingAnalysis: string;
  };
  recommendations: string[];
  flaggedSegments: Array<{
    startLine: number;
    endLine: number;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface CodeIntelligenceProps {
  code?: string;
  language?: string;
  codeFiles?: Array<{ name: string; content: string }>;
  submissionId?: string;
}

const CodeIntelligencePanel: React.FC<CodeIntelligenceProps> = ({
  code = '',
  language = 'javascript',
  codeFiles = [],
  submissionId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const runPlagiarismDetection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-plagiarism', {
        body: {
          code,
          language,
          codeFiles,
          submissionId
        }
      });

      if (error) throw error;

      setPlagiarismResult(data.analysis);
      toast({
        title: "Plagiarism analysis complete",
        description: `Risk level: ${data.analysis.riskLevel}`
      });

    } catch (error) {
      console.error('Error running plagiarism detection:', error);
      toast({
        title: "Analysis failed",
        description: "Could not complete plagiarism analysis.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-l-green-500 bg-green-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'high': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Code Intelligence & Security
          </CardTitle>
          <Button onClick={runPlagiarismDetection} disabled={loading || (!code && codeFiles.length === 0)}>
            <FileSearch className="w-4 h-4 mr-2" />
            {loading ? 'Analyzing...' : 'Analyze Code'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!plagiarismResult && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Run analysis to detect plagiarism and security issues</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Running AI-powered analysis...</span>
            </div>
            <Progress value={Math.random() * 100} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Analyzing code patterns, style consistency, and potential plagiarism indicators...
            </div>
          </div>
        )}

        {plagiarismResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="recommendations">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Risk Summary */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Overall Risk Assessment</h3>
                  <Badge className={getRiskColor(plagiarismResult.riskLevel)}>
                    <div className="flex items-center gap-1">
                      {getRiskIcon(plagiarismResult.riskLevel)}
                      {plagiarismResult.riskLevel.toUpperCase()}
                    </div>
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Risk Score</span>
                    <span>{plagiarismResult.overallRiskScore}/100</span>
                  </div>
                  <Progress value={plagiarismResult.overallRiskScore} className="h-2" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold">{plagiarismResult.suspiciousPatterns.length}</div>
                  <div className="text-sm text-muted-foreground">Suspicious Patterns</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-lg font-bold">{plagiarismResult.styleAnalysis.consistencyScore}%</div>
                  <div className="text-sm text-muted-foreground">Style Consistency</div>
                </div>
              </div>

              {/* Flagged Segments */}
              {plagiarismResult.flaggedSegments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Flagged Code Segments</h3>
                  {plagiarismResult.flaggedSegments.map((segment, index) => (
                    <div key={index} className={`p-3 border-l-4 ${getSeverityColor(segment.severity)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Lines {segment.startLine}-{segment.endLine}</span>
                        <Badge variant="outline" className="text-xs">
                          {segment.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{segment.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">Suspicious Patterns Detected</h3>
                {plagiarismResult.suspiciousPatterns.length > 0 ? (
                  plagiarismResult.suspiciousPatterns.map((pattern, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pattern.type.replace('_', ' ').toUpperCase()}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{pattern.confidence}% confidence</Badge>
                          <Badge variant="outline">Lines {pattern.lineNumbers[0]}-{pattern.lineNumbers[1]}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{pattern.description}</p>
                      {pattern.codeSegment && (
                        <div className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                          {pattern.codeSegment}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p>No suspicious patterns detected</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">Style Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Consistency Score</span>
                      <span>{plagiarismResult.styleAnalysis.consistencyScore}%</span>
                    </div>
                    <Progress value={plagiarismResult.styleAnalysis.consistencyScore} className="h-2" />
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Coding Style</h4>
                      <p className="text-sm text-muted-foreground">{plagiarismResult.styleAnalysis.codingStyle}</p>
                    </div>

                    {plagiarismResult.styleAnalysis.inconsistencies.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Style Inconsistencies</h4>
                        <ul className="space-y-1">
                          {plagiarismResult.styleAnalysis.inconsistencies.map((inconsistency, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                              {inconsistency}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">Similarity Indicators</h3>
                  <div className="space-y-3">
                    {plagiarismResult.similarityIndicators.commonPatterns.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Common Patterns</h4>
                        <ul className="space-y-1">
                          {plagiarismResult.similarityIndicators.commonPatterns.map((pattern, index) => (
                            <li key={index} className="text-sm text-muted-foreground">• {pattern}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plagiarismResult.similarityIndicators.suspiciousStructures.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Suspicious Structures</h4>
                        <ul className="space-y-1">
                          {plagiarismResult.similarityIndicators.suspiciousStructures.map((structure, index) => (
                            <li key={index} className="text-sm text-muted-foreground">• {structure}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-2">Variable Naming Analysis</h4>
                      <p className="text-sm text-muted-foreground">{plagiarismResult.similarityIndicators.variableNamingAnalysis}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">AI Recommendations</h3>
                {plagiarismResult.recommendations.length > 0 ? (
                  plagiarismResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 border-l-4 border-l-blue-500 bg-blue-50">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-800">{recommendation}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2" />
                    <p>No specific recommendations at this time</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default CodeIntelligencePanel;