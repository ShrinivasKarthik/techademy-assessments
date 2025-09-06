import React from 'react';
import Navigation from '@/components/Navigation';
import PerformanceMetricsDashboard from '@/components/enhanced/PerformanceMetricsDashboard';

const PerformanceMetricsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <PerformanceMetricsDashboard />
      </div>
    </div>
  );
};

export default PerformanceMetricsPage;