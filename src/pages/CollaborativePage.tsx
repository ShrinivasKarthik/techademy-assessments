import React, { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import CollaborativeAssessmentEditor from '@/components/CollaborativeAssessmentEditor';

const CollaborativePage = () => {
  useEffect(() => {
    document.title = 'Collaborative Assessment Editor - AssessAI';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6">
        <CollaborativeAssessmentEditor
          assessmentId="demo-assessment"
          onSave={(data) => {
            console.log('Saved collaborative assessment:', data);
          }}
        />
      </div>
    </div>
  );
};

export default CollaborativePage;