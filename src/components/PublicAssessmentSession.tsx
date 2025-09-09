import React, { useState, useEffect, useRef } from 'react';
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
import AnonymousLiveProctoringSystem, { AnonymousLiveProctoringSystemRef } from './AnonymousLiveProctoringSystem';
import AssessmentIntegrityCard from './AssessmentIntegrityCard';

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
  const [proctoringData, setProctoringData] = useState<any>(null);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: ''
  });
  const [isStarting, setIsStarting] = useState(false);
  const [sessionState, setSessionState] = useState<'loading' | 'ready' | 'proctoring_setup' | 'proctoring_check' | 'in_progress' | 'submitted' | 'paused'>('loading');
  const proctoringRef = useRef<AnonymousLiveProctoringSystemRef>(null);

  useEffect(() => {
    console.log('=== PUBLIC ASSESSMENT SESSION STARTING ===');
    console.log('Share token:', shareToken);
    console.log('Current URL:', window.location.href);
    initializeSession();
  }, [shareToken]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== CALLING TAKE-SHARED-ASSESSMENT FUNCTION ===');
      console.log('Token being sent:', shareToken);
      console.log('Supabase URL:', 'https://axdwgxtukqqzupboojmx.supabase.co');
      
      // Step 0: Clean up any stuck instances first
      try {
        console.log('=== CLEANING UP STUCK INSTANCES ===');
        const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke('cleanup-stuck-instances', {
          body: { shareToken },
        });
        
        if (cleanupResult?.success && cleanupResult.cleaned_count > 0) {
          console.log('Cleanup result:', cleanupResult.message);
          toast({
            title: "Cleanup Complete", 
            description: cleanupResult.message,
          });
        }
      } catch (cleanupErr) {
        console.log('Cleanup warning (non-critical):', cleanupErr);
      }
      
      // Step 1: Fetch assessment data
      const { data, error: fetchError } = await supabase.functions.invoke('take-shared-assessment', {
        body: { token: shareToken },
      });

      console.log('=== FUNCTION RESPONSE ===');
      console.log('Data:', data);
      console.log('Error:', fetchError);

      if (fetchError) {
        console.error('Error fetching shared assessment:', fetchError);
        
        // Handle specific HTTP status codes
        if (fetchError.message?.includes('429') || data?.error?.includes('Maximum number')) {
          setError('You have reached the maximum number of attempts for this assessment. No more attempts are allowed.');
        } else if (fetchError.message?.includes('410') || data?.error?.includes('expired')) {
          setError('This assessment link has expired and is no longer available.');
        } else if (fetchError.message?.includes('404') || data?.error?.includes('not found')) {
          setError('Assessment not found. Please check the link and try again.');
        } else {
          setError(`Failed to load assessment: ${fetchError.message || 'Unknown error'}`);
        }
        return;
      }

      if (!data?.success) {
        console.error('Function returned unsuccessful:', data);
        
        // Handle max attempts from response data
        if (data?.error?.includes('Maximum number') || data?.error?.includes('attempts')) {
          setError(`${data.error} (${data.attemptsUsed || 0}/${data.maxAttempts || 0} attempts used)`);
        } else {
          setError(data?.error || 'Assessment not available');
        }
        return;
      }

      console.log('=== SETTING ASSESSMENT DATA ===');
      console.log('Assessment:', data.assessment);
      console.log('Share config:', data.shareConfig);

      setAssessment(data.assessment);
      setShareConfig(data.shareConfig);
      
      // Always start fresh - no resuming of previous attempts
      setSessionState('ready');

    } catch (err: any) {
      console.error('Error initializing session:', err);
      setError(`Failed to initialize assessment session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Removed checkExistingInstance - always create fresh attempts

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

      console.log('=== STARTING ASSESSMENT ===');
      console.log('Assessment ID:', assessment.id);
      console.log('Share Token:', shareToken);
      console.log('Participant Info:', participantInfo);

      // Use the new database function that handles attempt logic
      const { data: result, error: instanceError } = await supabase
        .rpc('find_or_create_anonymous_instance', {
          p_assessment_id: assessment.id,
          p_share_token: shareToken,
          p_participant_name: participantInfo.name || null,
          p_participant_email: participantInfo.email || null,
          p_duration_minutes: assessment.duration_minutes
        });

      console.log('=== RPC RESULT ===');
      console.log('Result:', result);
      console.log('Error:', instanceError);

      if (instanceError) {
        console.error('RPC Error details:', instanceError);
        setError(`Failed to start assessment: ${instanceError.message || 'Database error'}`);
        return;
      }

      if (!result || result.length === 0) {
        console.error('No result returned from RPC');
        setError('Failed to start assessment: No response from server');
        return;
      }

      const firstResult = result[0];
      console.log('First result:', firstResult);
      
      // Check if attempts are exhausted
      if (!firstResult.instance_data) {
        setError(firstResult.message || 'No more attempts available');
        return;
      }

      // Parse the instance data and show attempt info
      const newInstance = firstResult.instance_data as unknown as AssessmentInstance;
      console.log('New instance created:', newInstance);
      setInstance(newInstance);
      
      // Show attempt information
      if (firstResult.attempts_remaining !== undefined) {
        toast({
          title: "Assessment Started",
          description: firstResult.message + ` (${firstResult.attempts_remaining} attempts remaining)`,
        });
      }

      if (assessment.proctoring_enabled) {
        console.log('📹 Proctoring enabled, setting up proctoring...');
        setSessionState('proctoring_setup');
      } else {
        console.log('✅ No proctoring required, starting assessment directly');
        setSessionState('in_progress');
      }

    } catch (error: any) {
      console.error('Error starting assessment:', error);
      setError(`Failed to start assessment: ${error.message || 'Unknown error'}`);
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
      console.log('🚀 Starting proctoring setup...');
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

      console.log('✅ Proctoring session created, transitioning to check state');
      setProctoringSession(newProctoringSession);
      setSessionState('proctoring_check');
    } catch (error: any) {
      console.error('Error setting up proctoring:', error);
      setError('Failed to setup proctoring');
    }
  };

  const handleProctoringStatusChange = async (status: 'active' | 'paused' | 'stopped') => {
    console.log('🔄 Proctoring status changed to:', status, 'from session state:', sessionState);
    
    if (status === 'active') {
      // Auto-transition to assessment when proctoring becomes active
      if (sessionState === 'proctoring_check' || sessionState === 'proctoring_setup') {
        console.log('✅ Transitioning to in_progress due to proctoring active');
        setSessionState('in_progress');
      }
    } else if (status === 'paused') {
      setSessionState('paused');
    } else if (status === 'stopped') {
      // Don't go back to setup automatically - this was causing the loop
      console.log('⚠️ Proctoring stopped but not changing session state automatically');
    }
  };

  const handleSecurityEvent = async (event: any) => {
    setSecurityViolations(prev => [...prev, event]);
    
    if (event.severity === 'critical') {
      setSessionState('paused');
    }
  };

  const handleSubmission = async (finalAnswers: any, evaluatedAnswers?: any) => {
    console.log('Assessment submitted with final answers:', finalAnswers);
    
    // End proctoring gracefully and collect violations
    let currentProctoringData = null;
    if (assessment?.proctoring_enabled && proctoringRef.current) {
      console.log('🏁 Ending proctoring system...');
      currentProctoringData = proctoringRef.current.getProctoringData();
      setProctoringData(currentProctoringData);
      proctoringRef.current.endProctoring();
      
      // Save proctoring data to assessment instance
      if (instance?.id && currentProctoringData) {
        console.log('💾 Saving proctoring data to assessment instance...');
        try {
          const { error: updateError } = await supabase
            .from('assessment_instances')
            .update({
              proctoring_violations: currentProctoringData.violations,
              proctoring_summary: currentProctoringData.summary,
              integrity_score: currentProctoringData.summary.integrity_score
            })
            .eq('id', instance.id);

          if (updateError) {
            console.error('❌ Error saving proctoring data:', updateError);
          } else {
            console.log('✅ Proctoring data saved successfully');
          }
          
          // Close proctoring session if exists
          if (proctoringSession?.id) {
            const { error: sessionError } = await supabase
              .from('proctoring_sessions')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                security_events: currentProctoringData.violations,
                monitoring_data: currentProctoringData.summary
              })
              .eq('id', proctoringSession.id);

            if (sessionError) {
              console.error('❌ Error closing proctoring session:', sessionError);
            } else {
              console.log('✅ Proctoring session closed');
            }
          }
        } catch (error) {
          console.error('❌ Error handling proctoring data:', error);
        }
      }
    }
    
    setInstance(prev => prev ? { ...prev, status: 'submitted' as any } : null);
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

  // Submitted state - this should now redirect to evaluation progress instead
  if (sessionState === 'submitted' && instance) {
    // This state should be rare since we redirect immediately on submission
    window.location.href = `/assessment/${instance.assessment_id}/evaluation/${instance.id}`;
    return null;
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
            ref={proctoringRef}
            assessmentId={assessment.id}
            participantId={`anon_${instance?.id || Date.now()}`}
            config={assessment.proctoring_config || {}}
            onSecurityEvent={handleSecurityEvent}
            onStatusChange={handleProctoringStatusChange}
            isInAssessment={false}
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
                proctoringData={proctoringData}
                showTwoColumnLayout={true}
                onProctoringStop={() => {
                  if (assessment.proctoring_enabled && proctoringRef.current) {
                    console.log('🛑 Assessment requesting proctoring stop...');
                    proctoringRef.current.cleanup();
                  }
                }}
              />
            </div>
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnonymousLiveProctoringSystem
                    ref={proctoringRef}
                    assessmentId={assessment.id}
                    participantId={`anon_${instance?.id || Date.now()}`}
                    config={assessment.proctoring_config || {}}
                    onSecurityEvent={handleSecurityEvent}
                    onStatusChange={handleProctoringStatusChange}
                    isInAssessment={true}
                  />
                </CardContent>
              </Card>

              {/* Assessment Integrity Card - moved from results to right column */}
              {proctoringData && (
                <AssessmentIntegrityCard proctoringData={proctoringData} />
              )}
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
          proctoringData={proctoringData}
          onProctoringStop={() => {
            if (assessment.proctoring_enabled && proctoringRef.current) {
              console.log('🛑 Assessment requesting proctoring stop...');
              proctoringRef.current.cleanup();
            }
          }}
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