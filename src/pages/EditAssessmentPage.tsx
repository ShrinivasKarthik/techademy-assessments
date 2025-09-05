import { useEffect } from 'react';
import Navigation from "@/components/Navigation";
import EditAssessment from "@/components/EditAssessment";

const EditAssessmentPage = () => {
  useEffect(() => {
    document.title = 'Edit Assessment - AssessAI';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <EditAssessment />
    </div>
  );
};

export default EditAssessmentPage;