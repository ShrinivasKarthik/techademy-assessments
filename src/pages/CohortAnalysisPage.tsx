import React from 'react';
import Navigation from '@/components/Navigation';
import CohortAnalysisDashboard from '@/components/analytics/CohortAnalysisDashboard';

const CohortAnalysisPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <CohortAnalysisDashboard />
      </div>
    </div>
  );
};

export default CohortAnalysisPage;