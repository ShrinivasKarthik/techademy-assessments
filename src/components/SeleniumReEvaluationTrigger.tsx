import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface ReEvaluationResult {
  success: boolean;
  processed: number;
  re_evaluated: number;
  errors: number;
  total_submissions: number;
  selenium_questions_found: number;
  message: string;
}

export function SeleniumReEvaluationTrigger() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ReEvaluationResult | null>(null);

  const handleReEvaluation = async () => {
    setIsProcessing(true);
    setResult(null);
    
    try {
      console.log('Starting Selenium re-evaluation...');
      
      const { data, error } = await supabase.functions.invoke('trigger-evaluations', {
        body: { forceSeleniumReEvaluation: true }
      });
      
      if (error) {
        throw error;
      }
      
      setResult(data);
      
      if (data.success) {
        toast.success(`Re-evaluation completed! ${data.re_evaluated} submissions processed.`);
      } else {
        toast.error(`Re-evaluation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error triggering re-evaluation:', error);
      toast.error('Failed to start re-evaluation process');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Selenium Re-Evaluation Tool
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Re-evaluate all Selenium coding submissions with the updated AI evaluation system.
          This will provide detailed locator analysis, best practices feedback, and automation recommendations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleReEvaluation}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing Selenium Submissions...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-Evaluate All Selenium Submissions
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {result.success ? 'Re-evaluation Completed' : 'Re-evaluation Failed'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Selenium Questions:</span>
                  <Badge variant="secondary">{result.selenium_questions_found}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Submissions:</span>
                  <Badge variant="secondary">{result.total_submissions}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Processed:</span>
                  <Badge variant="outline">{result.processed}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Re-evaluated:</span>
                  <Badge variant="default">{result.re_evaluated}</Badge>
                </div>
                {result.errors > 0 && (
                  <div className="flex justify-between">
                    <span>Errors:</span>
                    <Badge variant="destructive">{result.errors}</Badge>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {result.message}
            </p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This process will delete old evaluation data and create new detailed AI feedback</p>
          <p>• Selenium submissions will get comprehensive locator analysis and best practices review</p>
          <p>• The process may take several minutes for large datasets</p>
        </div>
      </CardContent>
    </Card>
  );
}