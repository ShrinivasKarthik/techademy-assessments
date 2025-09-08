import { useParams } from "react-router-dom";
import PublicAssessmentResults from "@/components/PublicAssessmentResults";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const PublicAssessmentResultsPage = () => {
  const { token } = useParams<{ token: string }>();
  const [instance, setInstance] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!token) {
        setError("Invalid assessment token");
        setLoading(false);
        return;
      }

      try {
        console.log('=== FETCHING RESULTS ===');
        console.log('Token:', token);
        
        // Fetch the assessment instance using the share token
        const { data: instanceData, error: instanceError } = await supabase
          .from('assessment_instances')
          .select('*')
          .eq('share_token', token)
          .eq('status', 'evaluated')
          .single();

        console.log('Instance query result:', { instanceData, instanceError });

        if (instanceError || !instanceData) {
          console.error('Instance error details:', instanceError);
          setError("Assessment results not found or not yet evaluated");
          setLoading(false);
          return;
        }

        // Fetch the assessment details
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select(`
            *,
            questions (
              id,
              title,
              question_type,
              points,
              order_index,
              config
            )
          `)
          .eq('id', instanceData.assessment_id)
          .single();

        console.log('Assessment query result:', { assessmentData, assessmentError });

        if (assessmentError || !assessmentData) {
          console.error('Assessment error details:', assessmentError);
          setError("Assessment details not found");
          setLoading(false);
          return;
        }

        setInstance(instanceData);
        setAssessment(assessmentData);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError("Failed to load assessment results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!instance || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Results Not Found</h1>
          <p className="text-muted-foreground">
            The assessment results could not be found or are not yet available.
          </p>
        </div>
      </div>
    );
  }

  return <PublicAssessmentResults instance={instance} assessment={assessment} />;
};

export default PublicAssessmentResultsPage;