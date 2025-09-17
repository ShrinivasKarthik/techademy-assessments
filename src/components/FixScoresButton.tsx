import { Button } from "@/components/ui/button";
import { runCleanupAndReEvaluate } from "@/utils/fixScores";
import { toast } from "sonner";
import { useState } from "react";

interface FixScoresButtonProps {
  instanceId?: string;
}

export const FixScoresButton = ({ instanceId }: FixScoresButtonProps) => {
  const [isFixing, setIsFixing] = useState(false);

  const handleFix = async () => {
    if (!instanceId) {
      toast.error("No instance ID provided");
      return;
    }

    setIsFixing(true);
    try {
      await runCleanupAndReEvaluate(instanceId);
      toast.success("Cleanup and re-evaluation completed successfully!");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Fix error:', error);
      toast.error("Failed to fix scores. Check console for details.");
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button 
      onClick={handleFix} 
      disabled={isFixing}
      variant="outline"
      size="sm"
    >
      {isFixing ? "Fixing..." : "Fix Scores & Re-evaluate"}
    </Button>
  );
};