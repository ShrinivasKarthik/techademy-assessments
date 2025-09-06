import React from 'react';
import Navigation from '@/components/Navigation';
import LearningPathRecommendations from '@/components/analytics/LearningPathRecommendations';

const LearningPathRecommendationsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <LearningPathRecommendations />
      </div>
    </div>
  );
};

export default LearningPathRecommendationsPage;