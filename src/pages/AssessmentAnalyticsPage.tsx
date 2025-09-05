import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import AssessmentAnalyticsDashboard from "@/components/AssessmentAnalyticsDashboard";
import EnhancedAnalyticsDashboard from "@/components/EnhancedAnalyticsDashboard";
import AIInsightsDashboard from "@/components/AIInsightsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AssessmentAnalyticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
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
        <Tabs defaultValue="enhanced" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="enhanced">Enhanced Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="enhanced" className="space-y-6">
            <EnhancedAnalyticsDashboard assessmentId={id} />
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-6">
            <AssessmentAnalyticsDashboard assessmentId={id} />
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-6">
            <AIInsightsDashboard assessmentId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssessmentAnalyticsPage;