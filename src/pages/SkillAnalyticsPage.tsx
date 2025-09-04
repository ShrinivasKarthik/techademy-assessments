import Navigation from "@/components/Navigation";
import SkillGapAnalysis from "@/components/SkillGapAnalysis";

const SkillAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Skills Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of skills performance and gaps
          </p>
        </div>
        <SkillGapAnalysis />
      </div>
    </div>
  );
};

export default SkillAnalyticsPage;