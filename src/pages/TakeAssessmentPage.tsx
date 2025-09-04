import { useParams } from "react-router-dom";
import TakeAssessment from "@/components/TakeAssessment";

const TakeAssessmentPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TakeAssessment assessmentId={id} />
    </div>
  );
};

export default TakeAssessmentPage;