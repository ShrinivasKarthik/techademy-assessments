import { useParams } from "react-router-dom";
import PublicAssessmentResults from "@/components/PublicAssessmentResults";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PublicAssessmentResultsPage = () => {
  const { token } = useParams<{ token: string }>();
  const [instance, setInstance] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Get email from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');

  useEffect(() => {
    console.log('PublicAssessmentResultsPage - useEffect triggered');
    console.log('Token:', token);
    console.log('Email param:', emailParam);
    
    if (emailParam) {
      // If email is in URL, fetch results directly
      console.log('Email found in URL, fetching results directly');
      fetchResults(emailParam);
    } else {
      // Show email input form
      console.log('No email in URL, showing email form');
      setShowEmailForm(true);
      setLoading(false);
    }
  }, [token, emailParam]);

  const fetchResults = async (email: string) => {
    if (!token || !email) {
      setError("Invalid assessment token or email");
      setLoading(false);
      return;
    }

    try {
      console.log('=== FETCHING RESULTS ===');
      console.log('Token:', token);
      console.log('Email:', email);
      
      // Fetch the assessment instance using the share token AND participant email
      const { data: instanceData, error: instanceError } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('share_token', token)
        .eq('participant_email', email)
        .eq('status', 'evaluated')
        .maybeSingle();

      console.log('Instance query result:', { instanceData, instanceError });

      if (instanceError || !instanceData) {
        console.error('Instance error details:', instanceError);
        setError("Assessment results not found or not yet evaluated. Please check your email address.");
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

  const handleEmailSubmit = () => {
    if (emailInput.trim()) {
      setLoading(true);
      setError(null);
      fetchResults(emailInput.trim());
    }
  };

  if (showEmailForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Your Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Please enter the email address you used for this assessment to view your results.
            </p>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
              />
              <Button onClick={handleEmailSubmit} className="w-full" disabled={!emailInput.trim()}>
                View Results
              </Button>
            </div>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <Button onClick={() => { setShowEmailForm(true); setError(null); }} className="mt-4">
            Try Again
          </Button>
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
          <Button onClick={() => { setShowEmailForm(true); setError(null); }} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return <PublicAssessmentResults instance={instance} assessment={assessment} />;
};

export default PublicAssessmentResultsPage;