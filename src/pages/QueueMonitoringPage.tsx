import React from 'react';
import Navigation from '@/components/Navigation';
import QueueMonitoringDashboard from '@/components/QueueMonitoringDashboard';

const QueueMonitoringPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <QueueMonitoringDashboard />
      </div>
    </div>
  );
};

export default QueueMonitoringPage;