import React, { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import InstructorUserManagement from '@/components/InstructorUserManagement';

const InstructorStudentsPage = () => {
  useEffect(() => {
    document.title = 'Student Management - AssessAI';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6">
        <InstructorUserManagement />
      </div>
    </div>
  );
};

export default InstructorStudentsPage;