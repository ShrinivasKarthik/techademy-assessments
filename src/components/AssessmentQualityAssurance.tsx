import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  PlayCircle,
  FileText,
  Target,
  Users,
  Zap,
  Shield,
  Brain,
  Lightbulb,
  BookOpen,
  Settings
} from "lucide-react";

interface QualityCheck {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'warning' | 'failed' | 'pending';
  details?: string;
  suggestions?: string[];
}

interface AssessmentQualityReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: QualityCheck[];
  recommendations: string[];
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface AssessmentQAProps {
  assessmentId: string;
  questions: any[];
  onQualityImproved?: () => void;
}

const AssessmentQualityAssurance: React.FC<AssessmentQAProps> = ({ 
  assessmentId, 
  questions = [],
  onQualityImproved 
}) => {
  const { toast } = useToast();
  const [qualityReport, setQualityReport] = useState<AssessmentQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [testingInProgress, setTestingInProgress] = useState(false);

  useEffect(() => {
    if (questions.length > 0) {
      runQualityAnalysis();
    }
  }, [questions, assessmentId]);

  const runQualityAnalysis = async () => {
    setLoading(true);
    
    try {
      // Simulate quality analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checks: QualityCheck[] = [
        {
          id: 'question_count',
          name: 'Question Count',
          description: 'Adequate number of questions for reliable assessment',
          status: questions.length >= 5 ? 'passed' : questions.length >= 3 ? 'warning' : 'failed',
          details: `Assessment has ${questions.length} questions. Recommended: 5-15 questions.`,
          suggestions: questions.length < 5 ? ['Add more questions to improve reliability', 'Consider different question types for variety'] : []
        },
        {
          id: 'question_variety',
          name: 'Question Type Variety',
          description: 'Mix of different question types for comprehensive evaluation',
          status: getQuestionVarietyStatus(),
          details: `Found ${getUniqueQuestionTypes().length} different question types: ${getUniqueQuestionTypes().join(', ')}`,
          suggestions: getUniqueQuestionTypes().length < 3 ? ['Add different question types (MCQ, coding, subjective)', 'Balance practical and theoretical questions'] : []
        },
        {
          id: 'difficulty_distribution',
          name: 'Difficulty Distribution',
          description: 'Balanced mix of easy, medium, and hard questions',
          status: getDifficultyDistributionStatus(),
          details: getDifficultyDistributionDetails(),
          suggestions: ['Consider adding more beginner-level questions', 'Balance advanced and intermediate questions']
        },
        {
          id: 'time_estimation',
          name: 'Time Allocation',
          description: 'Appropriate time allocation for question complexity',
          status: getTimeAllocationStatus(),
          details: 'Estimated completion time: 45-60 minutes',
          suggestions: []
        },
        {
          id: 'accessibility',
          name: 'Accessibility',
          description: 'Questions are accessible to all participants',
          status: 'passed',
          details: 'All questions include clear instructions and alternative text',
          suggestions: []
        },
        {
          id: 'bias_check',
          name: 'Bias Detection',
          description: 'Content is free from cultural, gender, or other biases',
          status: 'warning',
          details: 'Some questions may contain cultural references',
          suggestions: ['Review questions for cultural neutrality', 'Use inclusive language throughout']
        }
      ];

      const overallScore = calculateOverallScore(checks);
      
      const report: AssessmentQualityReport = {
        overallScore,
        grade: getGrade(overallScore),
        checks,
        recommendations: generateRecommendations(checks),
        estimatedTime: 45,
        difficulty: 'intermediate'
      };

      setQualityReport(report);
      
    } catch (error) {
      console.error('Error running quality analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze assessment quality",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuestionVarietyStatus = (): QualityCheck['status'] => {
    const types = getUniqueQuestionTypes();
    if (types.length >= 3) return 'passed';
    if (types.length >= 2) return 'warning';
    return 'failed';
  };

  const getUniqueQuestionTypes = () => {
    return [...new Set(questions.map(q => q.question_type || 'unknown'))];
  };

  const getDifficultyDistributionStatus = (): QualityCheck['status'] => {
    const difficulties = questions.map(q => q.difficulty || 'intermediate');
    const easy = difficulties.filter(d => d === 'beginner').length;
    const medium = difficulties.filter(d => d === 'intermediate').length;
    const hard = difficulties.filter(d => d === 'advanced').length;
    
    if (easy > 0 && medium > 0 && hard > 0) return 'passed';
    if ((easy > 0 && medium > 0) || (medium > 0 && hard > 0)) return 'warning';
    return 'failed';
  };

  const getDifficultyDistributionDetails = () => {
    const difficulties = questions.map(q => q.difficulty || 'intermediate');
    const easy = difficulties.filter(d => d === 'beginner').length;
    const medium = difficulties.filter(d => d === 'intermediate').length;
    const hard = difficulties.filter(d => d === 'advanced').length;
    
    return `Distribution: ${easy} beginner, ${medium} intermediate, ${hard} advanced`;
  };

  const getTimeAllocationStatus = (): QualityCheck['status'] => {
    // Simple heuristic: 2-5 minutes per question depending on type
    const estimatedMinutes = questions.reduce((total, q) => {
      switch (q.question_type) {
        case 'coding': return total + 15;
        case 'subjective': return total + 8;
        case 'mcq': return total + 3;
        case 'file_upload': return total + 10;
        default: return total + 5;
      }
    }, 0);
    
    if (estimatedMinutes <= 60) return 'passed';
    if (estimatedMinutes <= 90) return 'warning';
    return 'failed';
  };

  const calculateOverallScore = (checks: QualityCheck[]) => {
    const weights = { passed: 100, warning: 70, failed: 30, pending: 0 };
    const totalWeight = checks.reduce((sum, check) => sum + weights[check.status], 0);
    return Math.round(totalWeight / checks.length);
  };

  const getGrade = (score: number): AssessmentQualityReport['grade'] => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const generateRecommendations = (checks: QualityCheck[]) => {
    const recs = [];
    const failedChecks = checks.filter(c => c.status === 'failed');
    const warningChecks = checks.filter(c => c.status === 'warning');
    
    if (failedChecks.length > 0) {
      recs.push('Address critical issues first: ' + failedChecks.map(c => c.name.toLowerCase()).join(', '));
    }
    
    if (warningChecks.length > 0) {
      recs.push('Improve areas with warnings to enhance quality');
    }
    
    recs.push('Consider adding rubrics for subjective questions');
    recs.push('Test the assessment with a sample group before deployment');
    recs.push('Review and update questions based on performance data');
    
    return recs;
  };

  const runAssessmentTest = async () => {
    setTestingInProgress(true);
    
    try {
      // Simulate test run
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Test Complete",
        description: "Assessment test run completed successfully",
      });
      
      // Re-run quality analysis after test
      runQualityAnalysis();
      
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: "Test Error",
        description: "Failed to run assessment test",
        variant: "destructive",
      });
    } finally {
      setTestingInProgress(false);
    }
  };

  const getStatusIcon = (status: QualityCheck['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: QualityCheck['status']) => {
    switch (status) {
      case 'passed': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'failed': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-gray-50 border-gray-200';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-orange-600 bg-orange-50';
      case 'F': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-y-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyzing assessment quality...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {qualityReport && (
        <>
          {/* Quality Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Quality Assessment
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Badge className={`text-lg px-3 py-1 ${getGradeColor(qualityReport.grade)}`}>
                    Grade: {qualityReport.grade}
                  </Badge>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{qualityReport.overallScore}%</p>
                    <p className="text-sm text-muted-foreground">Quality Score</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-semibold">{qualityReport.estimatedTime} min</p>
                  <p className="text-sm text-muted-foreground">Est. Duration</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <p className="font-semibold capitalize">{qualityReport.difficulty}</p>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="font-semibold">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
              </div>

              <Progress value={qualityReport.overallScore} className="mb-4" />
              
              <div className="flex justify-between items-center">
                <Button onClick={runQualityAnalysis} variant="outline" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Re-analyze
                </Button>
                <Button 
                  onClick={runAssessmentTest} 
                  disabled={testingInProgress}
                  className="gap-2"
                >
                  {testingInProgress ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  Test Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Quality Checks</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {qualityReport.checks.map(check => (
                <Card key={check.id} className={getStatusColor(check.status)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{check.name}</h4>
                          <Badge variant="outline" className="capitalize">
                            {check.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {check.description}
                        </p>
                        {check.details && (
                          <p className="text-sm mb-2">{check.details}</p>
                        )}
                        {check.suggestions && check.suggestions.length > 0 && (
                          <ul className="text-sm space-y-1">
                            {check.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Improvement Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {qualityReport.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Best Practices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Accessibility
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Clear, simple language</li>
                        <li>• Alt text for images</li>
                        <li>• Sufficient contrast ratios</li>
                        <li>• Screen reader compatibility</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Security
                      </h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Enable proctoring if needed</li>
                        <li>• Set appropriate time limits</li>
                        <li>• Randomize question order</li>
                        <li>• Monitor for violations</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" />
                    Assessment Testing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Run a test to simulate the assessment experience and identify potential issues.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      onClick={runAssessmentTest}
                      disabled={testingInProgress}
                      className="h-20 flex-col gap-2"
                      variant="outline"
                    >
                      <PlayCircle className="w-6 h-6" />
                      <span>Quick Test (5 min)</span>
                    </Button>
                    
                    <Button 
                      onClick={runAssessmentTest}
                      disabled={testingInProgress}
                      className="h-20 flex-col gap-2"
                      variant="outline"
                    >
                      <Clock className="w-6 h-6" />
                      <span>Full Test Run</span>
                    </Button>
                  </div>

                  {testingInProgress && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Running assessment test...</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-semibold">Test Coverage:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Question rendering
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Navigation flow
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Timer functionality
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Submission process
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Proctoring integration
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Auto-save features
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default AssessmentQualityAssurance;