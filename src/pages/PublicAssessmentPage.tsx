import { useParams } from "react-router-dom";
import PublicAssessmentSession from "@/components/PublicAssessmentSession";

const PublicAssessmentPage = () => {
  const { token } = useParams<{ token: string }>();
  
  console.log('=== PUBLIC ASSESSMENT PAGE LOADED ===');
  console.log('Token from params:', token);
  console.log('Current URL:', window.location.href);
  console.log('Current pathname:', window.location.pathname);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Invalid Assessment Link</h1>
          <p className="text-muted-foreground">The assessment link you followed is not valid.</p>
        </div>
      </div>
    );
  }

  return <PublicAssessmentSession shareToken={token} />;
};

export default PublicAssessmentPage;