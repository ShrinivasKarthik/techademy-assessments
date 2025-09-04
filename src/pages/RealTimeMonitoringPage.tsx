import React from 'react';
import Navigation from '@/components/Navigation';
import RealTimeMonitoring from '@/components/RealTimeMonitoring';

const RealTimeMonitoringPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <RealTimeMonitoring />
      </div>
    </div>
  );
};

export default RealTimeMonitoringPage;