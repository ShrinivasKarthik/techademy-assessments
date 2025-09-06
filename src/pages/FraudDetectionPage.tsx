import React from 'react';
import Navigation from '@/components/Navigation';
import FraudDetectionSystem from '@/components/analytics/FraudDetectionSystem';

const FraudDetectionPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <FraudDetectionSystem />
      </div>
    </div>
  );
};

export default FraudDetectionPage;