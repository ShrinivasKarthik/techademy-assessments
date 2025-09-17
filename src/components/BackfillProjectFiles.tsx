import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const BackfillProjectFiles: React.FC = () => {
  const { toast } = useToast();
  const [assessmentTitle, setAssessmentTitle] = useState('Health App Spring Boot');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runBackfill = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-project-files', {
        body: {
          assessmentTitle: assessmentTitle.trim() || undefined,
          dryRun
        }
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: dryRun ? "Backfill Analysis Complete" : "Backfill Complete",
        description: `Found ${data.totalAssessments} assessments, ${dryRun ? 'would fix' : 'fixed'} ${data.totalQuestionsFixed} questions`
      });
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Error",
        description: "Failed to run backfill operation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Files Backfill Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Assessment Title Filter (optional)</Label>
            <Input
              id="title"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="Leave empty for all assessments"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dry-run">Dry Run Mode</Label>
              <p className="text-sm text-muted-foreground">
                Preview changes without actually modifying data
              </p>
            </div>
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
          </div>

          <Button 
            onClick={runBackfill} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running {dryRun ? 'Analysis' : 'Backfill'}...
              </>
            ) : (
              `Run ${dryRun ? 'Analysis' : 'Backfill'}`
            )}
          </Button>

          {!dryRun && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: This will clone project files and modify your database. Make sure you have a backup.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>
              {results.dryRun ? 'Analysis' : 'Backfill'} Results
              <Badge variant="outline" className="ml-2">
                {results.totalAssessments} assessments
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">{results.totalAssessments}</div>
                  <div className="text-sm text-muted-foreground">Assessments Scanned</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">{results.totalQuestionsFixed}</div>
                  <div className="text-sm text-muted-foreground">
                    Questions {results.dryRun ? 'Would Fix' : 'Fixed'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {results.results?.map((assessment: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{assessment.assessmentTitle}</h4>
                      <Badge variant={assessment.questionsFixed > 0 ? "default" : "secondary"}>
                        {assessment.questionsFixed} fixed
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {assessment.projectQuestions?.map((question: any, qIdx: number) => (
                        <div key={qIdx} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                          <span>{question.questionTitle}</span>
                          <div className="flex items-center gap-2">
                            {question.hasFiles ? (
                              <Badge variant="outline" className="text-green-600">Has Files</Badge>
                            ) : (
                              <>
                                {question.sourceFound ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                )}
                                <Badge variant={question.cloned ? "default" : "secondary"}>
                                  {question.action}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BackfillProjectFiles;