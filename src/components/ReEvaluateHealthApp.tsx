import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ReEvaluateHealthApp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const triggerReEvaluation = async () => {
    try {
      setLoading(true);
      console.log('Triggering re-evaluation for Project Assessment Health app...');

      const { data, error } = await supabase.functions.invoke('trigger-evaluations', {
        body: { 
          assessmentId: 'a64ec93c-d2d7-4bd5-9835-0bfa9b7c9557',
          reprocessEvaluated: true,
          force: true
        }
      });

      if (error) {
        console.error('Re-evaluation error:', error);
        toast({
          title: "Re-evaluation Failed",
          description: error.message || "Failed to trigger re-evaluation",
          variant: "destructive",
        });
      } else {
        console.log('Re-evaluation result:', data);
        toast({
          title: "Re-evaluation Triggered",
          description: "Enhanced evaluation with test scenarios has been triggered for all Health App submissions",
        });
      }
    } catch (err: any) {
      console.error('Error triggering re-evaluation:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to trigger re-evaluation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Re-evaluate Health App</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will re-run the evaluation for all submitted Project Assessment Health app instances 
          using the enhanced evaluation logic that includes test scenario completion scoring.
        </p>
        <Button 
          onClick={triggerReEvaluation} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Re-evaluating...' : 'Re-evaluate with Test Scenarios'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReEvaluateHealthApp;