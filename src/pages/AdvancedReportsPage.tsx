import React from 'react';
import Navigation from '@/components/Navigation';
import AdvancedReportingSystem from '@/components/AdvancedReportingSystem';

const AdvancedReportsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <AdvancedReportingSystem />
      </div>
    </div>
  );
};

export default AdvancedReportsPage;