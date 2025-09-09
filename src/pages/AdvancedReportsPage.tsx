import React from 'react';
import Navigation from '@/components/Navigation';
import AdvancedReportingSystem from '@/components/AdvancedReportingSystem';
import { SeleniumReEvaluationTrigger } from '@/components/SeleniumReEvaluationTrigger';

const AdvancedReportsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <AdvancedReportingSystem />
        
        {/* System Tools Section */}
        <div className="border-t pt-8">
          <h2 className="text-2xl font-bold mb-6">System Tools</h2>
          <SeleniumReEvaluationTrigger />
        </div>
      </div>
    </div>
  );
};

export default AdvancedReportsPage;