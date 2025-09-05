import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Users, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PublicAssessmentTaking from './PublicAssessmentTaking';
import PublicAssessmentResults from './PublicAssessmentResults';

interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  proctoring_enabled: boolean;
  proctoring_config: any;
  question_count: number;
  questions: any[];
}

interface ShareConfig {
  requireName: boolean;
  requireEmail: boolean;
  allowAnonymous: boolean;
  maxAttempts?: number;
  expiresAt?: string;
  accessCount: number;
  completionCount: number;
}

interface AssessmentInstance {
  id: string;
  assessment_id: string;
  participant_id?: string;
  participant_name?: string;
  participant_email?: string;
  share_token: string;
  is_anonymous: boolean;
  session_state: string;
  started_at: string;
  time_remaining_seconds?: number;
  current_question_index: number;
  status: string;
  submitted_at?: string;
  total_score?: number;
  max_possible_score?: number;
}

interface PublicAssessmentSessionProps {
  shareToken: string;
}

const PublicAssessmentSession: React.FC<PublicAssessmentSessionProps> = ({ shareToken }) => {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);
  const [instance, setInstance] = useState<AssessmentInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [sessionState, setSessionState] = useState<'not_started' | 'participant_info' | 'in_progress' | 'submitted'>('not_started');

  useEffect(() => {
    fetchSharedAssessment();
  }, [shareToken]);

  const fetchSharedAssessment = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching shared assessment with token:', shareToken);
      
      const { data, error } = await supabase.functions.invoke('take-shared-assessment', {
        body: { token: shareToken },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Error fetching shared assessment:', error);
        setError('Failed to load assessment');
        return;
      }

      if (!data) {
        console.error('No data received from edge function');
        setError('No response from server');
        return;
      }

      if (!data.success) {
        console.error('Edge function returned success=false:', data);
        setError(data.error || 'Assessment not available');
        return;
      }

      console.log('Setting assessment data:', data.assessment);
      console.log('Setting share config:', data.shareConfig);

      setAssessment(data.assessment);
      setShareConfig(data.shareConfig);

      // Check if there's already an instance for this session
      await checkExistingInstance();

    } catch (err: any) {
      console.error('Error:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingInstance = async () => {
    try {
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_anonymous', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking existing instance:', error);
        return;
      }

      if (instances && instances.length > 0) {
        const instance = instances[0];
        setInstance(instance);
        
        if (instance.status === 'submitted') {
          setSessionState('submitted');
        } else if (instance.session_state === 'in_progress') {
          setSessionState('in_progress');
        }
      }
    } catch (err) {
      console.error('Error checking existing instance:', err);
    }
  };

  const startAssessment = async () => {
    if (!assessment || !shareConfig) return;

    // Validate required fields
    if (shareConfig.requireName && !participantName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    if (shareConfig.requireEmail && !participantEmail.trim()) {
      toast({
        title: "Email Required", 
        description: "Please enter your email to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsStarting(true);

      // Create assessment instance for anonymous participant
      const { data: newInstance, error: instanceError } = await supabase
        .from('assessment_instances')
        .insert({
          assessment_id: assessment.id,
          participant_id: null, // Anonymous
          participant_name: participantName.trim() || null,
          participant_email: participantEmail.trim() || null,
          share_token: shareToken,
          is_anonymous: true,
          session_state: 'in_progress',
          time_remaining_seconds: assessment.duration_minutes * 60,
          current_question_index: 0,
          status: 'in_progress'
        })
        .select()
        .single();

      if (instanceError) {
        console.error('Error creating instance:', instanceError);
        toast({
          title: "Error",
          description: "Failed to start assessment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setInstance(newInstance);
      setSessionState('in_progress');

      toast({
        title: "Assessment Started",
        description: "Good luck with your assessment!",
      });

    } catch (err: any) {
      console.error('Error starting assessment:', err);
      toast({
        title: "Error",
        description: "Failed to start assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmission = (submittedInstance: AssessmentInstance) => {
    setInstance(submittedInstance);
    setSessionState('submitted');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Assessment Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assessment || !shareConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Assessment not found</p>
      </div>
    );
  }

  if (sessionState === 'submitted' && instance) {
    return <PublicAssessmentResults instance={instance} assessment={assessment} />;
  }

  if (sessionState === 'in_progress' && instance) {
    return (
      <PublicAssessmentTaking
        assessmentId={assessment.id}
        instance={instance}
        onSubmission={handleSubmission}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{assessment.title}</CardTitle>
            {assessment.description && (
              <p className="text-muted-foreground mt-2">{assessment.description}</p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Assessment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">{assessment.duration_minutes} minutes</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Questions</p>
                  <p className="text-sm text-muted-foreground">{assessment.question_count} questions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Attempts</p>
                  <p className="text-sm text-muted-foreground">
                    {shareConfig.accessCount} taken
                    {shareConfig.maxAttempts && ` / ${shareConfig.maxAttempts} max`}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            {assessment.instructions && (
              <Alert>
                <AlertDescription>
                  <strong>Instructions:</strong> {assessment.instructions}
                </AlertDescription>
              </Alert>
            )}

            {/* Expiration Warning */}
            {shareConfig.expiresAt && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This assessment expires on {new Date(shareConfig.expiresAt).toLocaleDateString()} at {new Date(shareConfig.expiresAt).toLocaleTimeString()}.
                </AlertDescription>
              </Alert>
            )}

            {/* Participant Information Form */}
            {(shareConfig.requireName || shareConfig.requireEmail) && (
              <div className="space-y-4">
                <h3 className="font-medium">Participant Information</h3>
                
                {shareConfig.requireName && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      disabled={isStarting}
                    />
                  </div>
                )}
                
                {shareConfig.requireEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      disabled={isStarting}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Start Button */}
            <div className="text-center">
              <Button
                onClick={startAssessment}
                disabled={isStarting}
                size="lg"
                className="w-full md:w-auto"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Assessment...
                  </>
                ) : (
                  'Start Assessment'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicAssessmentSession;