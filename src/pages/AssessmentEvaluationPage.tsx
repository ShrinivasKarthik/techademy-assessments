import { useParams } from "react-router-dom";
import AssessmentEvaluationProgress from "@/components/AssessmentEvaluationProgress";

const AssessmentEvaluationPage = () => {
  const { assessmentId, instanceId } = useParams<{ 
    assessmentId: string; 
    instanceId: string; 
  }>();

  if (!assessmentId || !instanceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Invalid Assessment</h1>
          <p className="text-muted-foreground">Assessment or instance not found.</p>
        </div>
      </div>
    );
  }

  return <AssessmentEvaluationProgress assessmentId={assessmentId} instanceId={instanceId} />;
};

export default AssessmentEvaluationPage;