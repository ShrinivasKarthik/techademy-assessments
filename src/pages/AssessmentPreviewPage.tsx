import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AssessmentPreview from "@/components/AssessmentPreview";

const AssessmentPreviewPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Assessment not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AssessmentPreview assessmentId={id} />
    </div>
  );
};

export default AssessmentPreviewPage;