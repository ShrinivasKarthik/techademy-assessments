import React, { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import SmartQuestionAssembly from '@/components/SmartQuestionAssembly';

const SmartAssemblyPage = () => {
  useEffect(() => {
    document.title = 'Smart Question Assembly - AssessAI';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6">
        <SmartQuestionAssembly
          onAssemblyComplete={(questions) => {
            console.log('Smart assembly completed with questions:', questions);
            // In real implementation, this would integrate with assessment creation
          }}
        />
      </div>
    </div>
  );
};

export default SmartAssemblyPage;