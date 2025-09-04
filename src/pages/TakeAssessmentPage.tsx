import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import TakeAssessment from "@/components/TakeAssessment";

const TakeAssessmentPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <TakeAssessment assessmentId={id} />
    </div>
  );
};

export default TakeAssessmentPage;