import { useState } from "react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import AssessmentDashboard from "@/components/AssessmentDashboard";
import CodeAssessment from "@/components/CodeAssessment";
import FeaturesSection from "@/components/FeaturesSection";
import CreateAssessment from "@/components/CreateAssessment";
import AssessmentList from "@/components/AssessmentList";

const Index = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'create' | 'list'>('dashboard');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return <CreateAssessment />;
      case 'list':
        return <AssessmentList />;
      default:
        return (
          <>
            <HeroSection />
            <AssessmentDashboard />
            <CodeAssessment />
            <FeaturesSection />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Quick Navigation for Development */}
      <div className="border-b bg-muted/20 p-4">
        <div className="max-w-6xl mx-auto flex gap-2">
          <Button 
            variant={currentView === 'dashboard' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </Button>
          <Button 
            variant={currentView === 'create' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setCurrentView('create')}
          >
            Create Assessment
          </Button>
          <Button 
            variant={currentView === 'list' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setCurrentView('list')}
          >
            View Assessments
          </Button>
        </div>
      </div>

      {renderCurrentView()}
    </div>
  );
};

export default Index;
