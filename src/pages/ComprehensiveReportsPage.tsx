import React from 'react';
import Navigation from '@/components/Navigation';
import ComprehensiveReportingEngine from '@/components/enhanced/ComprehensiveReportingEngine';

const ComprehensiveReportsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <ComprehensiveReportingEngine />
      </div>
    </div>
  );
};

export default ComprehensiveReportsPage;