import React from 'react';
import BackfillProjectFiles from '@/components/BackfillProjectFiles';
import Navigation from '@/components/Navigation';

const BackfillPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-8">
        <BackfillProjectFiles />
      </main>
    </div>
  );
};

export default BackfillPage;