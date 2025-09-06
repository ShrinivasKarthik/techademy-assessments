import React, { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import AdvancedQuestionBuilder from '@/components/AdvancedQuestionBuilder';

const AdvancedQuestionBuilderPage = () => {
  useEffect(() => {
    document.title = 'Advanced Question Builder - AssessAI';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6">
        <AdvancedQuestionBuilder
          onSave={(config) => {
            console.log('Advanced question saved:', config);
            // In real implementation, this would save to database
          }}
        />
      </div>
    </div>
  );
};

export default AdvancedQuestionBuilderPage;