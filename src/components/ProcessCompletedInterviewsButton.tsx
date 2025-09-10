import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play, Loader2 } from 'lucide-react';

export const ProcessCompletedInterviewsButton = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcessInterviews = async () => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-completed-interviews');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${data.processedCount} interview sessions`,
      });

      if (data.errors && data.errors.length > 0) {
        console.warn('Some errors occurred during processing:', data.errors);
        toast({
          title: "Partial Success",
          description: `${data.errors.length} sessions had errors. Check console for details.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error processing interviews:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process completed interviews",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleProcessInterviews}
      disabled={isProcessing}
      className="flex items-center gap-2"
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {isProcessing ? 'Processing...' : 'Process Completed Interviews'}
    </Button>
  );
};