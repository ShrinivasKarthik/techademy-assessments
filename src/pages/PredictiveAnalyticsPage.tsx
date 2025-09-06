import React from 'react';
import Navigation from '@/components/Navigation';
import PredictiveAnalyticsDashboard from '@/components/analytics/PredictiveAnalyticsDashboard';

const PredictiveAnalyticsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <PredictiveAnalyticsDashboard />
      </div>
    </div>
  );
};

export default PredictiveAnalyticsPage;