import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TestEvaluationTrigger: React.FC = () => {
  const [instanceId, setInstanceId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const triggerEvaluation = async () => {
    if (!instanceId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instance ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Triggering evaluation for instance:', instanceId);

      const { data, error } = await supabase.functions.invoke('trigger-evaluation', {
        body: { instanceId: instanceId.trim() }
      });

      if (error) {
        console.error('Evaluation error:', error);
        toast({
          title: "Evaluation Failed",
          description: error.message || "Failed to trigger evaluation",
          variant: "destructive",
        });
      } else {
        console.log('Evaluation result:', data);
        toast({
          title: "Evaluation Triggered",
          description: "Assessment evaluation has been triggered successfully",
        });
      }
    } catch (err: any) {
      console.error('Error triggering evaluation:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to trigger evaluation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Test Evaluation Trigger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="instanceId">Assessment Instance ID</Label>
          <Input
            id="instanceId"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            placeholder="Enter instance ID..."
          />
        </div>
        <Button 
          onClick={triggerEvaluation} 
          disabled={loading || !instanceId.trim()}
          className="w-full"
        >
          {loading ? 'Triggering...' : 'Trigger Evaluation'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestEvaluationTrigger;