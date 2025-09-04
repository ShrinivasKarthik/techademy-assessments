import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AIInsightsDashboard from "@/components/AIInsightsDashboard";

const AIInsightsPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI Assessment Insights</h1>
          <p className="text-muted-foreground">
            AI-powered analysis and recommendations for assessment improvement
          </p>
        </div>
        <AIInsightsDashboard assessmentId={id} />
      </div>
    </div>
  );
};

export default AIInsightsPage;