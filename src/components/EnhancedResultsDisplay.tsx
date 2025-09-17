import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  FileText, 
  Code, 
  MessageSquare, 
  Upload,
  Mic,
  Award,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import InterviewAnalyticsDisplay from '@/components/interview/InterviewAnalyticsDisplay';
import { FixScoresButton } from '@/components/FixScoresButton';

interface Question {
  id: string;
  title: string;
  question_type: 'project_based' | 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio' | 'interview';
  points: number;
  order_index: number;
}

interface Evaluation {
  id: string;
  submission_id: string;
  score: number;
  max_score: number;
  evaluated_at: string;
  ai_feedback?: any;
  feedback?: string;
  question_id?: string;
}

interface EnhancedResultsDisplayProps {
  assessmentId: string;
  instanceId: string;
  assessment: any;
  instance: any;
}

const EnhancedResultsDisplay: React.FC<EnhancedResultsDisplayProps> = ({
  assessmentId,
  instanceId,
  assessment,
  instance
}) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [retriggeringEvaluation, setRetriggeringEvaluation] = useState(false);

  useEffect(() => {
    loadResults();
  }, [instanceId]);

  const loadResults = async () => {
    try {
      // Load questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('order_index');

      if (questionsData) {
        setQuestions(questionsData);
        setMaxScore(questionsData.reduce((sum, q) => sum + q.points, 0));
      }

      // Load evaluations - first get submissions, then evaluations
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, question_id, answer')
        .eq('instance_id', instanceId);

      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map(s => s.id);
        
        const { data: evaluationsData } = await supabase
          .from('evaluations')
          .select('*')
          .in('submission_id', submissionIds);

        if (evaluationsData) {
          // Add question_id to evaluations by matching submission_id
          const enhancedEvaluations = evaluationsData.map(evaluation => {
            const submission = submissions.find(s => s.id === evaluation.submission_id);
            return { ...evaluation, question_id: submission?.question_id };
          });
          
          setEvaluations(enhancedEvaluations);
          setTotalScore(evaluationsData.reduce((sum, e) => sum + (e.score || 0), 0));
        }
      }

    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <FileText className="w-4 h-4" />;
      case 'coding': return <Code className="w-4 h-4" />;
      case 'subjective': return <MessageSquare className="w-4 h-4" />;
      case 'file_upload': return <Upload className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'interview': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { variant: 'default' as const, text: 'Excellent', icon: Trophy };
    if (percentage >= 80) return { variant: 'secondary' as const, text: 'Good', icon: Award };
    if (percentage >= 70) return { variant: 'outline' as const, text: 'Average', icon: Target };
    return { variant: 'destructive' as const, text: 'Needs Improvement', icon: TrendingUp };
  };

  const calculatePercentage = () => maxScore > 0 ? Math.min(Math.round((totalScore / maxScore) * 100), 100) : 0;
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const retriggerEvaluation = async (questionId?: string) => {
    setRetriggeringEvaluation(true);
    try {
      console.log('Retriggering evaluation for instance:', instanceId);
      
      const { data, error } = await supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      });
      
      if (error) {
        console.error('Failed to retrigger evaluation:', error);
        return;
      }
      
      console.log('Evaluation retriggered successfully:', data);
      
      // Reload results after a short delay
      setTimeout(() => {
        loadResults();
      }, 2000);
      
    } catch (error) {
      console.error('Error retriggering evaluation:', error);
    } finally {
      setRetriggeringEvaluation(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const percentage = calculatePercentage();
  const performance = getPerformanceBadge(percentage);
  const PerformanceIcon = performance.icon;

  return (
    <div className="space-y-6">
      {/* Overall Results Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Assessment Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(totalScore, maxScore)}`}>
                {totalScore}
              </div>
              <div className="text-sm text-muted-foreground">Total Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{maxScore}</div>
              <div className="text-sm text-muted-foreground">Maximum Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{percentage}%</div>
              <div className="text-sm text-muted-foreground">Percentage</div>
            </div>
            <div className="text-center">
              <Badge variant={performance.variant} className="text-sm">
                <PerformanceIcon className="w-3 h-3 mr-1" />
                {performance.text}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Performance</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
            
            {/* Show fix button if scores are inconsistent */}
            {totalScore > maxScore && (
              <div className="mt-4 text-center">
                <FixScoresButton instanceId={instanceId} />
                <p className="text-sm text-muted-foreground mt-2">
                  Score inconsistency detected. Click to fix and re-evaluate.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time and Completion Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {formatDuration(instance?.duration_taken_seconds || instance?.duration_taken || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Time Taken</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {instance?.questions_answered || evaluations.length}
            </div>
            <div className="text-sm text-muted-foreground">Questions Answered</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {questions.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </CardContent>
        </Card>
      </div>

      {/* Question-by-Question Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div>No questions found for this assessment</div>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => retriggerEvaluation()}
                  disabled={retriggeringEvaluation}
                >
                  {retriggeringEvaluation ? 'Re-evaluating...' : 'Refresh Results'}
                </Button>
              </div>
            ) : (
              questions.map((question, index) => {
                const evaluation = evaluations.find(e => e.question_id === question.id);
                const score = evaluation?.score || 0;
                const questionPercentage = Math.round((score / question.points) * 100);
                
                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getQuestionIcon(question.question_type)}
                        <div>
                          <h4 className="font-medium">
                            Question {index + 1}: {question.title}
                          </h4>
                          <div className="text-sm text-muted-foreground">
                            {question.question_type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(score, question.points)}`}>
                          {score}/{question.points}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {questionPercentage}%
                        </div>
                      </div>
                    </div>
                    
                    <Progress value={questionPercentage} className="h-2" />
                  
                   {/* Interview Question - Show Comprehensive Analytics */}
                   {question.question_type === 'interview' ? (
                     <div className="mt-4">
                       <InterviewAnalyticsDisplay instanceId={instanceId} />
                     </div>
                   ) : evaluation?.ai_feedback ? (
                     <div className="mt-4 space-y-4">
                       {/* Enhanced AI Feedback Display */}
                       
                       {/* Overall Performance Summary */}
                       {evaluation.ai_feedback.overallScore !== undefined && (
                         <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                           <CardContent className="p-4">
                             <div className="flex items-center gap-2 mb-2">
                               <Award className="w-4 h-4 text-blue-600" />
                               <span className="font-semibold text-blue-900">Overall Performance</span>
                             </div>
                             <div className="text-2xl font-bold text-blue-700">
                               {evaluation.ai_feedback.overallScore}%
                             </div>
                             <Progress value={evaluation.ai_feedback.overallScore} className="mt-2" />
                           </CardContent>
                         </Card>
                       )}

                       {/* Score Breakdown */}
                       {evaluation.ai_feedback.scoreBreakdown && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <Target className="w-4 h-4" />
                               Score Breakdown
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className="grid grid-cols-2 gap-4">
                               {Object.entries(evaluation.ai_feedback.scoreBreakdown).map(([key, value]: [string, any]) => (
                                 <div key={key}>
                                   <div className="flex justify-between text-sm mb-1">
                                     <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                     <span className="font-medium">{Math.round(value)}%</span>
                                   </div>
                                   <Progress value={value} className="h-2" />
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       )}

                       {/* Test Results */}
                       {evaluation.ai_feedback.executionResults?.testResults && evaluation.ai_feedback.executionResults.testResults.length > 0 && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <CheckCircle className="w-4 h-4" />
                               Test Results
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className="space-y-2">
                               {evaluation.ai_feedback.executionResults.testResults.map((test: any, i: number) => (
                                 <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${
                                   test.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                 }`}>
                                   {test.passed ? 
                                     <CheckCircle className="w-4 h-4 text-green-600" /> : 
                                     <Target className="w-4 h-4 text-red-600" />
                                   }
                                   <div className="flex-1">
                                     <div className="text-sm font-medium">
                                       {test.name || `Test ${i + 1}`}
                                     </div>
                                     {test.message && (
                                       <div className="text-xs text-muted-foreground">
                                         {test.message}
                                       </div>
                                     )}
                                   </div>
                                   <Badge variant={test.passed ? "default" : "destructive"}>
                                     {test.passed ? "Pass" : "Fail"}
                                   </Badge>
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       )}

                       {/* Code Quality Analysis */}
                       {evaluation.ai_feedback.codeQuality && Object.keys(evaluation.ai_feedback.codeQuality).length > 0 && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <Code className="w-4 h-4" />
                               Code Quality Analysis
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             {evaluation.ai_feedback.codeQuality.score !== undefined && (
                               <div className="mb-3">
                                 <div className="flex justify-between text-sm mb-1">
                                   <span>Overall Code Quality</span>
                                   <span className="font-medium">{evaluation.ai_feedback.codeQuality.score}%</span>
                                 </div>
                                 <Progress value={evaluation.ai_feedback.codeQuality.score} className="h-2" />
                               </div>
                             )}
                             
                             {evaluation.ai_feedback.codeQuality.issues && evaluation.ai_feedback.codeQuality.issues.length > 0 && (
                               <div className="space-y-2">
                                 <div className="text-sm font-medium text-orange-700">Issues Found:</div>
                                 {evaluation.ai_feedback.codeQuality.issues.slice(0, 5).map((issue: any, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-orange-50 border border-orange-200 rounded">
                                     <div className="font-medium">{issue.type || 'Code Issue'}</div>
                                     <div className="text-muted-foreground">{issue.message || issue}</div>
                                   </div>
                                 ))}
                               </div>
                             )}

                             {evaluation.ai_feedback.codeQuality.suggestions && evaluation.ai_feedback.codeQuality.suggestions.length > 0 && (
                               <div className="mt-3 space-y-2">
                                 <div className="text-sm font-medium text-blue-700">Suggestions:</div>
                                 {evaluation.ai_feedback.codeQuality.suggestions.slice(0, 3).map((suggestion: string, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                                     {suggestion}
                                   </div>
                                 ))}
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       )}

                        {/* Test Scenarios Section */}
                        {evaluation.ai_feedback.scenarioEvaluation && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Test Scenarios Completion
                                <Badge variant="outline" className="ml-auto">
                                  {evaluation.ai_feedback.scenarioEvaluation.completedScenarios}/{evaluation.ai_feedback.scenarioEvaluation.totalScenarios}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Overall Completion</span>
                                  <span className="font-medium">
                                    {evaluation.ai_feedback.scenarioEvaluation.completionRate}% 
                                    ({Math.round(evaluation.ai_feedback.scenarioEvaluation.scenarioScore)}% weighted)
                                  </span>
                                </div>
                                <Progress 
                                  value={evaluation.ai_feedback.scenarioEvaluation.completionRate} 
                                  className="h-3"
                                />
                              </div>
                              
                              {evaluation.ai_feedback.scenarioEvaluation.scenarioResults && 
                               evaluation.ai_feedback.scenarioEvaluation.scenarioResults.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium">Scenario Details:</div>
                                  {evaluation.ai_feedback.scenarioEvaluation.scenarioResults.map((scenario: any, i: number) => (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                                      scenario.completed 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-red-50 border-red-200'
                                    }`}>
                                      {scenario.completed ? 
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> : 
                                        <Target className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                      }
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium">
                                          {scenario.description}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge 
                                            variant={scenario.completed ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            {scenario.completed ? "Completed" : "Not Completed"}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            {scenario.priority || 'medium'} priority
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {evaluation.ai_feedback.scenarioEvaluation.totalScenarios === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                  No test scenarios were defined for this question
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Performance Analysis */}
                        {evaluation.ai_feedback.performance && Object.keys(evaluation.ai_feedback.performance).length > 0 && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <TrendingUp className="w-4 h-4" />
                               Performance Analysis
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className="grid grid-cols-2 gap-4">
                               {evaluation.ai_feedback.performance.timeComplexity && (
                                 <div className="p-3 bg-muted rounded-lg">
                                   <div className="text-sm font-medium">Time Complexity</div>
                                   <div className="text-lg font-bold text-primary">
                                     {evaluation.ai_feedback.performance.timeComplexity}
                                   </div>
                                 </div>
                               )}
                               
                               {evaluation.ai_feedback.performance.spaceComplexity && (
                                 <div className="p-3 bg-muted rounded-lg">
                                   <div className="text-sm font-medium">Space Complexity</div>
                                   <div className="text-lg font-bold text-primary">
                                     {evaluation.ai_feedback.performance.spaceComplexity}
                                   </div>
                                 </div>
                               )}
                               
                               {evaluation.ai_feedback.executionResults?.executionTime && (
                                 <div className="p-3 bg-muted rounded-lg">
                                   <div className="text-sm font-medium">Execution Time</div>
                                   <div className="text-lg font-bold">
                                     {evaluation.ai_feedback.executionResults.executionTime}ms
                                   </div>
                                 </div>
                               )}
                               
                               {evaluation.ai_feedback.performance.efficiency && (
                                 <div className="p-3 bg-muted rounded-lg">
                                   <div className="text-sm font-medium">Efficiency Score</div>
                                   <div className="text-lg font-bold text-green-600">
                                     {evaluation.ai_feedback.performance.efficiency}%
                                   </div>
                                 </div>
                               )}
                             </div>

                             {evaluation.ai_feedback.performance.suggestions && evaluation.ai_feedback.performance.suggestions.length > 0 && (
                               <div className="mt-3 space-y-2">
                                 <div className="text-sm font-medium text-green-700">Performance Improvements:</div>
                                 {evaluation.ai_feedback.performance.suggestions.slice(0, 3).map((suggestion: string, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-green-50 border border-green-200 rounded">
                                     {suggestion}
                                   </div>
                                 ))}
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       )}

                       {/* Errors and Warnings */}
                       {(evaluation.ai_feedback.executionResults?.errors?.length > 0 || evaluation.ai_feedback.executionResults?.warnings?.length > 0) && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <MessageSquare className="w-4 h-4" />
                               Execution Issues
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             {evaluation.ai_feedback.executionResults.errors?.length > 0 && (
                               <div className="space-y-2">
                                 <div className="text-sm font-medium text-red-700">Errors:</div>
                                 {evaluation.ai_feedback.executionResults.errors.slice(0, 3).map((error: any, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                                     <div className="font-medium">{error.type || 'Error'}</div>
                                     <div className="text-muted-foreground">{error.message || error}</div>
                                   </div>
                                 ))}
                               </div>
                             )}

                             {evaluation.ai_feedback.executionResults.warnings?.length > 0 && (
                               <div className="space-y-2 mt-3">
                                 <div className="text-sm font-medium text-yellow-700">Warnings:</div>
                                 {evaluation.ai_feedback.executionResults.warnings.slice(0, 3).map((warning: any, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded">
                                     <div className="font-medium">{warning.type || 'Warning'}</div>
                                     <div className="text-muted-foreground">{warning.message || warning}</div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       )}

                       {/* Hints and Improvements */}
                       {(evaluation.ai_feedback.hints?.length > 0 || evaluation.ai_feedback.improvements?.length > 0 || evaluation.ai_feedback.optimizationSuggestions?.length > 0) && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <Trophy className="w-4 h-4" />
                               Suggestions & Improvements
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             {evaluation.ai_feedback.hints?.length > 0 && (
                               <div className="space-y-2">
                                 <div className="text-sm font-medium text-blue-700">Hints:</div>
                                 {evaluation.ai_feedback.hints.slice(0, 4).map((hint: string, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                                     💡 {hint}
                                   </div>
                                 ))}
                               </div>
                             )}

                             {evaluation.ai_feedback.improvements?.length > 0 && (
                               <div className="space-y-2 mt-3">
                                 <div className="text-sm font-medium text-green-700">Improvements:</div>
                                 {evaluation.ai_feedback.improvements.slice(0, 4).map((improvement: string, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-green-50 border border-green-200 rounded">
                                     ✨ {improvement}
                                   </div>
                                 ))}
                               </div>
                             )}

                             {evaluation.ai_feedback.optimizationSuggestions?.length > 0 && (
                               <div className="space-y-2 mt-3">
                                 <div className="text-sm font-medium text-purple-700">Optimizations:</div>
                                 {evaluation.ai_feedback.optimizationSuggestions.slice(0, 3).map((optimization: string, i: number) => (
                                   <div key={i} className="text-xs p-2 bg-purple-50 border border-purple-200 rounded">
                                     ⚡ {optimization}
                                   </div>
                                 ))}
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       )}

                       {/* Debugging Information */}
                       {evaluation.ai_feedback.debugging && Object.keys(evaluation.ai_feedback.debugging).length > 0 && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm flex items-center gap-2">
                               <Code className="w-4 h-4" />
                               Debugging Information
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             {evaluation.ai_feedback.debugging.executionTrace && (
                               <div className="text-xs">
                                 <div className="font-medium mb-2">Execution Trace:</div>
                                 <div className="bg-muted p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                                   {evaluation.ai_feedback.debugging.executionTrace}
                                 </div>
                               </div>
                             )}
                             
                             {evaluation.ai_feedback.debugging.variableStates && (
                               <div className="text-xs mt-3">
                                 <div className="font-medium mb-2">Variable States:</div>
                                 <div className="bg-muted p-2 rounded font-mono text-xs">
                                   {JSON.stringify(evaluation.ai_feedback.debugging.variableStates, null, 2)}
                                 </div>
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       )}

                       {/* Legacy/Standard feedback fallback */}
                       {evaluation.ai_feedback.selenium_analysis && (
                         <Card>
                           <CardHeader className="pb-3">
                             <CardTitle className="text-sm">Selenium Analysis</CardTitle>
                           </CardHeader>
                           <CardContent className="pt-0">
                             <div className="text-sm">
                               Overall Score: {evaluation.ai_feedback.selenium_analysis?.seleniumScore?.overallScore || 0}/100
                             </div>
                             
                             {(evaluation.ai_feedback.locator_analysis || evaluation.ai_feedback.selenium_analysis?.locatorAnalysis) && (
                               <div className="mt-3">
                                 <div className="font-medium mb-2">Locator Quality:</div>
                                 <div className="space-y-1">
                                   {(evaluation.ai_feedback.locator_analysis || evaluation.ai_feedback.selenium_analysis?.locatorAnalysis || []).slice(0, 3).map((loc: any, i: number) => (
                                     <div key={i} className="text-xs p-2 bg-muted rounded">
                                       <code className="bg-background px-1 rounded">{loc.locator}</code> - {loc.stability}
                                       {loc.recommendation && <div className="text-muted-foreground mt-1">{loc.recommendation}</div>}
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </CardContent>
                         </Card>
                       )}

                       {/* Basic AI feedback for simple evaluations */}
                       {evaluation.ai_feedback.evaluation_method && !evaluation.ai_feedback.overallScore && (
                         <Card>
                           <CardContent className="p-4">
                             <div className="text-sm">
                               <div className="font-medium mb-2">
                                 AI Feedback: Evaluated using {evaluation.ai_feedback.evaluation_method}
                                 {evaluation.ai_feedback.confidence && ` with ${Math.round(evaluation.ai_feedback.confidence * 100)}% confidence`}
                               </div>
                               {evaluation.ai_feedback.detailed_feedback && (
                                 <div className="text-muted-foreground">
                                   {evaluation.ai_feedback.detailed_feedback}
                                 </div>
                               )}
                             </div>
                           </CardContent>
                         </Card>
                       )}
                     </div>
                   ) : evaluation?.feedback ? (
                     <div className="mt-3 p-3 bg-muted rounded-lg">
                       <div className="text-sm">
                         <strong>Feedback:</strong> {evaluation.feedback}
                       </div>
                     </div>
                   ) : (
                     <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                       <div className="text-sm text-yellow-800">
                         <strong>No detailed feedback available.</strong> Evaluation may be incomplete.
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="ml-2"
                           onClick={() => retriggerEvaluation(question.id)}
                           disabled={retriggeringEvaluation}
                         >
                           {retriggeringEvaluation ? 'Re-evaluating...' : 'Re-evaluate'}
                         </Button>
                       </div>
                     </div>
                   )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedResultsDisplay;