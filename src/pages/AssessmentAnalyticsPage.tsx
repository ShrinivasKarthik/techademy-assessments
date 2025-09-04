import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AssessmentAnalyticsDashboard from "@/components/AssessmentAnalyticsDashboard";

const AssessmentAnalyticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/assessments")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assessments
          </Button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <AssessmentAnalyticsDashboard assessmentId={id} />
      </div>
    </div>
  );
};

export default AssessmentAnalyticsPage;