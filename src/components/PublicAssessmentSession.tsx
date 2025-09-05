import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Users, FileText, AlertTriangle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PublicAssessmentTaking from './PublicAssessmentTaking';
import PublicAssessmentResults from './PublicAssessmentResults';
import AnonymousLiveProctoringSystem from './AnonymousLiveProctoringSystem';

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
  const [proctoringSession, setProctoringSession] = useState<any>(null);
  const [anonymousParticipantId, setAnonymousParticipantId] = useState<string | null>(null);
  const [securityViolations, setSecurityViolations] = useState<any[]>([]);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: ''
  });
  const [isStarting, setIsStarting] = useState(false);
  const [sessionState, setSessionState] = useState<'loading' | 'ready' | 'proctoring_setup' | 'proctoring_check' | 'in_progress' | 'submitted' | 'paused'>('loading');

  useEffect(() => {
    console.log('=== PUBLIC ASSESSMENT SESSION STARTING ===');
    console.log('Share token:', shareToken);
    fetchSharedAssessment();
  }, [shareToken]);

  const fetchSharedAssessment = async () => {
    try {
      console.log('=== FETCHING SHARED ASSESSMENT ===');
      console.log('Making request to take-shared-assessment with token:', shareToken);
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('take-shared-assessment', {
        body: { token: shareToken },
      });

      if (error) {
        console.error('Error fetching shared assessment:', error);
        setError('Failed to load assessment');
        return;
      }

      if (!data?.success) {
        setError(data?.error || 'Assessment not available');
        return;
      }

      setAssessment(data.assessment);
      setShareConfig(data.shareConfig);
      
      // Only proceed if we have valid assessment data
      if (data.assessment && data.shareConfig) {
        await checkExistingInstance(data.assessment);
        // Finally set to ready state after everything is loaded
        setSessionState('ready');
      } else {
        setError('Invalid assessment data received');
      }

    } catch (err: any) {
      console.error('Error:', err);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingInstance = async (validatedAssessment: Assessment) => {
    try {
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_anonymous', true)
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking existing instance:', error);
        return;
      }

      if (instances && instances.length > 0) {
        const existingInstance = instances[0];
        setInstance(existingInstance);
        setAnonymousParticipantId(existingInstance.participant_id || `anon_${Date.now()}`);
        
        if (existingInstance.status === 'submitted') {
          // Don't change session state here - let the main function handle it
          setAnonymousParticipantId(existingInstance.participant_id || `anon_${Date.now()}`);
        } else if (validatedAssessment.proctoring_enabled && existingInstance.session_state) {
          // Resume existing proctoring state
          setAnonymousParticipantId(existingInstance.participant_id || `anon_${Date.now()}`);
        } else {
          // Will be handled by main function setting to 'ready'
        }
      }
    } catch (err) {
      console.error('Error checking existing instance:', err);
    }
  };

  const startProctoringSetup = () => {
    // Double-check assessment is loaded before starting proctoring
    if (!assessment || !shareConfig) {
      setError('Assessment not properly loaded. Please refresh and try again.');
      return;
    }
    
    if (assessment.proctoring_enabled) {
      const tempId = crypto.randomUUID(); // Generate proper UUID for anonymous participant
      setAnonymousParticipantId(tempId);
      setSessionState('proctoring_setup');
    } else {
      startAssessment();
    }
  };

  const completeProctoringSetup = async () => {
    try {
      // Triple-check assessment exists before proctoring setup
      if (!assessment || !shareConfig || !anonymousParticipantId) {
        setError('Assessment data missing. Cannot start proctoring.');
        return;
      }

      // First create assessment instance for anonymous user
      const { data: newInstance, error: instanceError } = await supabase
        .from('assessment_instances')
        .insert({
          assessment_id: assessment.id,
          participant_id: null, // Anonymous user
          participant_name: participantInfo.name,
          participant_email: participantInfo.email,
          is_anonymous: true,
          share_token: shareToken,
          status: 'in_progress',
          session_state: 'proctoring_check',
          time_remaining_seconds: assessment.duration_minutes * 60,
          current_question_index: 0
        })
        .select()
        .single();

      if (instanceError) {
        console.error('Error creating assessment instance:', instanceError);
        setError('Failed to create assessment instance');
        return;
      }

      setInstance(newInstance);

      // Now create proctoring session with the assessment instance ID
      const { data: newProctoringSession, error: proctoringError } = await supabase
        .from('proctoring_sessions')
        .insert({
          assessment_instance_id: newInstance.id,
          participant_id: null, // Allow null for anonymous users
          status: 'initializing',
          permissions: {},
          security_events: [],
          monitoring_data: {}
        })
        .select()
        .single();

      if (proctoringError) {
        console.error('=== PROCTORING SESSION ERROR ===');
        console.error('Error details:', proctoringError);
        console.error('Error code:', proctoringError.code);
        console.error('Error message:', proctoringError.message);
        console.error('Anonymous participant ID:', anonymousParticipantId);
        setError(`Failed to initialize proctoring: ${proctoringError.message}`);
        return;
      }

      setProctoringSession(newProctoringSession);
      setSessionState('proctoring_check');
    } catch (error) {
      console.error('Error setting up proctoring:', error);
      setError('Failed to setup proctoring');
    }
  };

  const handleProctoringStatusChange = async (status: 'active' | 'paused' | 'stopped') => {
    if (status === 'active' && sessionState === 'proctoring_check') {
      await startAssessment();
    } else if (status === 'paused') {
      setSessionState('paused');
    }
  };

  const handleSecurityEvent = async (event: any) => {
    setSecurityViolations(prev => [...prev, event]);
    
    if (event.severity === 'critical') {
      setSessionState('paused');
    }
  };

  const startAssessment = async () => {
    try {
      // Final validation before starting assessment
      if (!assessment || !shareConfig) {
        setError('Assessment data not loaded properly. Please refresh and try again.');
        return;
      }

      // Validate required participant information
      if (shareConfig.requireName && !participantInfo.name.trim()) {
        setError('Name is required');
        return;
      }

      if (shareConfig.requireEmail && !participantInfo.email.trim()) {
        setError('Email is required');
        return;
      }

      setIsStarting(true);

      // Create assessment instance
      const instanceData = {
        assessment_id: assessment.id,
        share_token: shareToken,
        participant_name: participantInfo.name || null,
        participant_email: participantInfo.email || null,
        participant_id: anonymousParticipantId || null,
        is_anonymous: true,
        time_remaining_seconds: assessment.duration_minutes * 60,
        session_state: assessment.proctoring_enabled ? 'in_progress' : null,
        status: 'in_progress' as const
      };

      const { data: newInstance, error: instanceError } = await supabase
        .from('assessment_instances')
        .insert(instanceData)
        .select()
        .single();

      if (instanceError) {
        console.error('Error creating assessment instance:', instanceError);
        setError('Failed to start assessment');
        return;
      }

      // Update proctoring session with instance ID if proctoring is enabled
      if (assessment.proctoring_enabled && proctoringSession) {
        await supabase
          .from('proctoring_sessions')
          .update({ assessment_instance_id: newInstance.id })
          .eq('id', proctoringSession.id);
      }

      setInstance(newInstance);
      setSessionState('in_progress');
    } catch (error) {
      console.error('Error starting assessment:', error);
      setError('Failed to start assessment');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmission = (submittedInstance: AssessmentInstance) => {
    setInstance(submittedInstance);
    setSessionState('submitted');
  };

  // Show loading state
  if (loading || sessionState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  // Show error state - STOP EVERYTHING if there's an error
  if (error || !assessment || !shareConfig) {
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
            <p className="text-muted-foreground">
              {error || 'Assessment could not be loaded. Please check the link and try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle existing submitted instance
  if (instance?.status === 'submitted') {
    return <PublicAssessmentResults instance={instance} assessment={assessment} />;
  }

  // Show paused state
  if (sessionState === 'paused') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-destructive">Assessment Paused</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your assessment has been paused due to security violations. Please contact the administrator.
            </p>
            <div className="space-y-2">
              {securityViolations.map((violation, index) => (
                <div key={index} className="p-2 bg-destructive/10 rounded text-sm">
                  {violation.description}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show proctoring setup ONLY after assessment is validated AND user clicked start
  if (sessionState === 'proctoring_setup' && assessment && shareConfig && assessment.proctoring_enabled && anonymousParticipantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Proctoring Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This assessment requires proctoring. Please ensure you have:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>A working camera and microphone</li>
              <li>A quiet, well-lit environment</li>
              <li>No other people in the room</li>
              <li>Closed all other applications and browser tabs</li>
            </ul>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Once proctoring starts, you will be monitored throughout the assessment.
                Any suspicious activity may result in your assessment being paused or terminated.
              </AlertDescription>
            </Alert>
            <Button onClick={completeProctoringSetup} className="w-full">
              Start Proctoring Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show proctoring check ONLY after assessment is validated
  if (sessionState === 'proctoring_check' && assessment && shareConfig && assessment.proctoring_enabled && anonymousParticipantId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Proctoring Environment Check
              </CardTitle>
              <p className="text-muted-foreground">
                Please complete the environment check before starting your assessment.
              </p>
            </CardHeader>
          </Card>
          <AnonymousLiveProctoringSystem
            assessmentId={assessment.id}
            participantId={anonymousParticipantId}
            config={assessment.proctoring_config || {}}
            onSecurityEvent={handleSecurityEvent}
            onStatusChange={handleProctoringStatusChange}
          />
        </div>
      </div>
    );
  }

  // Show assessment taking interface if in progress
  if (sessionState === 'in_progress' && instance && assessment) {
    if (assessment.proctoring_enabled && anonymousParticipantId) {
      return (
        <div className="min-h-screen bg-background">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
            <div className="lg:col-span-2">
              <PublicAssessmentTaking
                assessmentId={assessment.id}
                instance={instance}
                onSubmission={handleSubmission}
              />
            </div>
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Proctoring Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnonymousLiveProctoringSystem
                    assessmentId={assessment.id}
                    participantId={anonymousParticipantId}
                    config={assessment.proctoring_config || {}}
                    onSecurityEvent={handleSecurityEvent}
                    onStatusChange={handleProctoringStatusChange}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <PublicAssessmentTaking
          assessmentId={assessment.id}
          instance={instance}
          onSubmission={handleSubmission}
        />
      );
    }
  }

  // Main assessment start screen - This should ONLY show when sessionState is 'ready'
  if (sessionState !== 'ready') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground">Processing...</p>
          </CardContent>
        </Card>
      </div>
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

            {/* Proctoring Warning */}
            {assessment.proctoring_enabled && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Shield className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Proctored Assessment:</strong> This assessment includes live proctoring. 
                  You will need to grant camera and microphone permissions and will be monitored throughout the assessment.
                </AlertDescription>
              </Alert>
            )}

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
                      value={participantInfo.name}
                      onChange={(e) => setParticipantInfo(prev => ({ ...prev, name: e.target.value }))}
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
                      value={participantInfo.email}
                      onChange={(e) => setParticipantInfo(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isStarting}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Start Button */}
            <div className="text-center">
              <Button
                onClick={assessment.proctoring_enabled ? startProctoringSetup : startAssessment}
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
                  <>
                    {assessment.proctoring_enabled ? (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Start Proctored Assessment
                      </>
                    ) : (
                      'Start Assessment'
                    )}
                  </>
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