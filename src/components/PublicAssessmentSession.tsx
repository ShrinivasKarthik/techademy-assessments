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
    initializeSession();
  }, [shareToken]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Fetch assessment data
      const { data, error: fetchError } = await supabase.functions.invoke('take-shared-assessment', {
        body: { token: shareToken },
      });

      if (fetchError) {
        console.error('Error fetching shared assessment:', fetchError);
        setError('Failed to load assessment');
        return;
      }

      if (!data?.success) {
        setError(data?.error || 'Assessment not available');
        return;
      }

      setAssessment(data.assessment);
      setShareConfig(data.shareConfig);
      
      // Step 2: Check for existing instance
      await checkExistingInstance(data.assessment.id);
      
      // Step 3: Set ready state
      setSessionState('ready');

    } catch (err: any) {
      console.error('Error initializing session:', err);
      setError('Failed to initialize assessment session');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingInstance = async (assessmentId: string) => {
    try {
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_anonymous', true)
        .eq('assessment_id', assessmentId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking existing instance:', error);
        return;
      }

      if (instances && instances.length > 0) {
        const existingInstance = instances[0];
        setInstance(existingInstance);
        
        if (existingInstance.status === 'submitted') {
          setSessionState('submitted');
        } else if (existingInstance.session_state === 'in_progress') {
          setSessionState('in_progress');
        }
      }
    } catch (err) {
      console.error('Error checking existing instance:', err);
    }
  };

  const validateParticipantInfo = () => {
    if (!shareConfig) return false;
    
    if (shareConfig.requireName && !participantInfo.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (shareConfig.requireEmail && !participantInfo.email.trim()) {
      setError('Email is required');
      return false;
    }

    return true;
  };

  const startAssessment = async () => {
    if (!assessment || !shareConfig) {
      setError('Assessment data not loaded properly');
      return;
    }

    if (!validateParticipantInfo()) {
      return;
    }

    try {
      setIsStarting(true);
      setError(null);

      // Use the database function to safely create or find instance
      const { data: instanceData, error: instanceError } = await supabase
        .rpc('find_or_create_anonymous_instance', {
          p_assessment_id: assessment.id,
          p_share_token: shareToken,
          p_participant_name: participantInfo.name || null,
          p_participant_email: participantInfo.email || null,
          p_duration_minutes: assessment.duration_minutes
        });

      if (instanceError) {
        console.error('Error creating/finding instance:', instanceError);
        setError(`Failed to start assessment: ${instanceError.message}`);
        return;
      }

      setInstance(instanceData);

      if (assessment.proctoring_enabled) {
        setSessionState('proctoring_setup');
      } else {
        setSessionState('in_progress');
      }

    } catch (error: any) {
      console.error('Error starting assessment:', error);
      setError(`Failed to start assessment: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const startProctoringSetup = () => {
    if (!assessment?.proctoring_enabled) {
      startAssessment();
      return;
    }
    
    // Check if proctoring should auto-start
    if (assessment.proctoring_config?.autoStart) {
      // Auto-start proctoring and go directly to assessment
      completeProctoringSetup();
    } else {
      // Manual proctoring setup
      setSessionState('proctoring_setup');
    }
  };

  const completeProctoringSetup = async () => {
    if (!instance) {
      setError('No assessment instance found');
      return;
    }

    try {
      // Create proctoring session
      const { data: newProctoringSession, error: proctoringError } = await supabase
        .from('proctoring_sessions')
        .insert({
          assessment_instance_id: instance.id,
          participant_id: null, // Anonymous user
          status: 'initializing',
          permissions: {},
          security_events: [],
          monitoring_data: {}
        })
        .select()
        .single();

      if (proctoringError) {
        console.error('Error creating proctoring session:', proctoringError);
        setError('Failed to initialize proctoring');
        return;
      }

      setProctoringSession(newProctoringSession);
      setSessionState('proctoring_check');
    } catch (error: any) {
      console.error('Error setting up proctoring:', error);
      setError('Failed to setup proctoring');
    }
  };

  const handleProctoringStatusChange = async (status: 'active' | 'paused' | 'stopped') => {
    if (status === 'active') {
      // Auto-transition to assessment when proctoring becomes active
      if (sessionState === 'proctoring_check' || sessionState === 'proctoring_setup') {
        startAssessment();
      }
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

  const handleSubmission = (submittedInstance: AssessmentInstance) => {
    setInstance(submittedInstance);
    setSessionState('submitted');
  };

  // Loading state
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

  // Error state
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
            <p className="text-muted-foreground mb-4">
              {error || 'Assessment could not be loaded. Please check the link and try again.'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitted state
  if (sessionState === 'submitted' && instance) {
    return <PublicAssessmentResults instance={instance} assessment={assessment} />;
  }

  // Paused state
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

  // Proctoring setup
  if (sessionState === 'proctoring_setup' && assessment.proctoring_enabled) {
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

  // Proctoring check
  if (sessionState === 'proctoring_check' && assessment.proctoring_enabled) {
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
            participantId={`anon_${Date.now()}`}
            config={assessment.proctoring_config || {}}
            onSecurityEvent={handleSecurityEvent}
            onStatusChange={handleProctoringStatusChange}
          />
        </div>
      </div>
    );
  }

  // Assessment taking
  if (sessionState === 'in_progress' && instance) {
    if (assessment.proctoring_enabled) {
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
                    participantId={`anon_${Date.now()}`}
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

  // Initial assessment info screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{assessment.title}</CardTitle>
          {assessment.description && (
            <p className="text-muted-foreground">{assessment.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Assessment Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{assessment.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{assessment.question_count} questions</span>
            </div>
            {assessment.proctoring_enabled && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Proctored</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          {assessment.instructions && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Instructions:</strong> {assessment.instructions}
              </AlertDescription>
            </Alert>
          )}

          {/* Participant Information */}
          {(shareConfig.requireName || shareConfig.requireEmail) && (
            <div className="space-y-4">
              <h3 className="font-medium">Participant Information</h3>
              
              {shareConfig.requireName && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={participantInfo.name}
                    onChange={(e) => setParticipantInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              
              {shareConfig.requireEmail && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={participantInfo.email}
                    onChange={(e) => setParticipantInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Start Button */}
          <Button 
            onClick={startAssessment} 
            className="w-full" 
            size="lg"
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting Assessment...
              </>
            ) : (
              assessment.proctoring_enabled ? 'Start Proctored Assessment' : 'Start Assessment'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicAssessmentSession;