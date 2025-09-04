import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import AssessmentDashboard from "@/components/AssessmentDashboard";
import CodeAssessment from "@/components/CodeAssessment";
import FeaturesSection from "@/components/FeaturesSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <AssessmentDashboard />
      <CodeAssessment />
      <FeaturesSection />
    </div>
  );
};

export default Index;
