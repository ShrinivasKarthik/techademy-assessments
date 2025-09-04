import { useParams } from "react-router-dom";
import AssessmentSession from "@/components/AssessmentSession";

const TakeAssessmentPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <AssessmentSession assessmentId={id} />
  );
};

export default TakeAssessmentPage;