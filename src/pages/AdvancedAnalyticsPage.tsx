import Navigation from "@/components/Navigation";
import ComprehensiveAnalyticsDashboard from "@/components/ComprehensiveAnalyticsDashboard";

const AdvancedAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <ComprehensiveAnalyticsDashboard />
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;