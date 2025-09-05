import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import CreateAssessment from "@/components/CreateAssessment";

const CreateAssessmentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  // Redirect old edit URLs to new edit route
  useEffect(() => {
    if (editId) {
      navigate(`/assessments/${editId}/edit`, { replace: true });
    }
  }, [editId, navigate]);

  // Don't render if redirecting
  if (editId) {
    return null;
  }

  useEffect(() => {
    document.title = 'Create Assessment - AssessAI';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <CreateAssessment />
    </div>
  );
};

export default CreateAssessmentPage;