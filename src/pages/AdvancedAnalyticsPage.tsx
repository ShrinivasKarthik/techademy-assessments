import Navigation from "@/components/Navigation";
import AdvancedAnalyticsDashboard from "@/components/AdvancedAnalyticsDashboard";

const AdvancedAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <AdvancedAnalyticsDashboard />
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;