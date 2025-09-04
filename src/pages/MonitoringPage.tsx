import React from 'react';
import Navigation from '@/components/Navigation';
import LiveMonitoring from '@/components/LiveMonitoring';

const MonitoringPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <LiveMonitoring />
      </div>
    </div>
  );
};

export default MonitoringPage;