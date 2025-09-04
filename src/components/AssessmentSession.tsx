import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  Mic,
  Monitor,
  Timer,
  User,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedAssessmentTaking from './EnhancedAssessmentTaking';
import LiveProctoringSystem from './LiveProctoringSystem';

type SessionState = 'not_started' | 'proctoring_setup' | 'proctoring_check' | 'in_progress' | 'paused' | 'submitted' | 'evaluated';

interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  proctoring_enabled: boolean;
  proctoring_config: any;
  questions: any[];
}

interface AssessmentInstance {
  id: string;
  session_state: string;
  started_at: string;
  time_remaining_seconds: number;
  current_question_index: number;
  proctoring_started_at?: string;
  proctoring_violations: any[];
  status: string;
  assessment_id: string;
  participant_id: string;
  submitted_at?: string;
  max_possible_score?: number;
  total_score?: number;
}

interface ProctoringSession {
  id: string;
  status: string;
  permissions: any;
  security_events: any[];
  assessment_instance_id: string;
  participant_id: string;
  monitoring_data: any;
  started_at: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

interface AssessmentSessionProps {
  assessmentId: string;
  participantId?: string;
}

const AssessmentSession: React.FC<AssessmentSessionProps> = ({ 
  assessmentId, 
  participantId = 'sample-participant' 
}) => {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [instance, setInstance] = useState<AssessmentInstance | null>(null);
  const [proctoringSession, setProctoringSession] = useState<ProctoringSession | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('not_started');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupProgress, setSetupProgress] = useState(0);
  const [securityViolations, setSecurityViolations] = useState<any[]>([]);

  useEffect(() => {
    initializeSession();
  }, [assessmentId]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      
      // Fetch assessment details with proctoring configuration
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select(`
          id, title, description, instructions, duration_minutes, 
          proctoring_enabled, proctoring_config,
          questions (*)
        `)
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;
      
      setAssessment(assessmentData);

      // Check for existing assessment instance
      const { data: existingInstance } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId)
        .eq('status', 'in_progress')
        .single();

      if (existingInstance) {
        setInstance(existingInstance as AssessmentInstance);
        setSessionState(existingInstance.session_state as SessionState);
        
        if (assessmentData.proctoring_enabled && existingInstance.session_state === 'in_progress') {
          // Resume proctoring session
          await resumeProctoringSession(existingInstance.id);
        }
      } else {
        // Determine initial state based on proctoring requirements
        const initialState = assessmentData.proctoring_enabled ? 'proctoring_setup' : 'not_started';
        setSessionState(initialState);
      }

    } catch (error) {
      console.error('Error initializing session:', error);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const startProctoringSetup = async () => {
    if (!assessment) return;

    setSessionState('proctoring_setup');
    setSetupProgress(25);

    // Simulate setup progress
    const progressInterval = setInterval(() => {
      setSetupProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 25;
      });
    }, 1000);

    toast({
      title: "Initializing Proctoring",
      description: "Setting up security monitoring...",
    });
  };

  const completeProctoringSetup = async () => {
    setSessionState('proctoring_check');
    
    // Create proctoring session record
    const { data: proctoringData, error } = await supabase
      .from('proctoring_sessions')
      .insert({
        assessment_instance_id: instance?.id,
        participant_id: participantId,
        status: 'initializing'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating proctoring session:', error);
      toast({
        title: "Setup Error",
        description: "Failed to initialize proctoring session",
        variant: "destructive"
      });
      return;
    }

    setProctoringSession(proctoringData as ProctoringSession);
  };

  const handleProctoringStatusChange = async (status: 'active' | 'paused' | 'stopped') => {
    if (proctoringSession) {
      // Update proctoring session status
      await supabase
        .from('proctoring_sessions')
        .update({ status })
        .eq('id', proctoringSession.id);

      setProctoringSession(prev => prev ? { ...prev, status } : null);
    }

    if (status === 'active' && sessionState === 'proctoring_check') {
      startAssessment();
    }
  };

  const handleSecurityEvent = async (event: any) => {
    setSecurityViolations(prev => [event, ...prev]);

    // Update assessment instance with violation
    if (instance) {
      const updatedViolations = [...securityViolations, event];
      await supabase
        .from('assessment_instances')
        .update({ 
          proctoring_violations: updatedViolations,
          session_state: event.severity === 'critical' ? 'paused' : sessionState
        })
        .eq('id', instance.id);

      if (event.severity === 'critical') {
        setSessionState('paused');
        toast({
          title: "Critical Security Event",
          description: event.description,
          variant: "destructive"
        });
      }
    }
  };

  const startAssessment = async () => {
    if (!assessment) return;

    try {
      // Create or update assessment instance
      const instanceData = {
        assessment_id: assessmentId,
        participant_id: participantId,
        session_state: 'in_progress',
        time_remaining_seconds: assessment.duration_minutes * 60,
        current_question_index: 0,
        proctoring_started_at: assessment.proctoring_enabled ? new Date().toISOString() : null
      };

      let newInstance;
      if (instance) {
        const { data, error } = await supabase
          .from('assessment_instances')
          .update(instanceData)
          .eq('id', instance.id)
          .select()
          .single();
        
        if (error) throw error;
        newInstance = data;
      } else {
        const { data, error } = await supabase
          .from('assessment_instances')
          .insert(instanceData)
          .select()
          .single();
        
        if (error) throw error;
        newInstance = data;
      }

      setInstance(newInstance as AssessmentInstance);
      setSessionState('in_progress');

      toast({
        title: "Assessment Started",
        description: `You have ${assessment.duration_minutes} minutes to complete this assessment.`,
      });

    } catch (error) {
      console.error('Error starting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to start assessment",
        variant: "destructive"
      });
    }
  };

  const resumeProctoringSession = async (instanceId: string) => {
    const { data } = await supabase
      .from('proctoring_sessions')
      .select('*')
      .eq('assessment_instance_id', instanceId)
      .single();

    if (data) {
      setProctoringSession(data as ProctoringSession);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Assessment not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Assessment in progress - show unified interface
  if (sessionState === 'in_progress') {
    return (
      <div className="min-h-screen bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 h-screen">
          {/* Assessment Taking Area */}
          <div className="lg:col-span-3 overflow-auto">
            <EnhancedAssessmentTaking 
              assessmentId={assessmentId} 
            />
          </div>

          {/* Proctoring Sidebar */}
          {assessment.proctoring_enabled && (
            <div className="lg:col-span-1 border-l bg-card overflow-auto">
              <div className="p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Live Monitoring
                </h3>
                <LiveProctoringSystem
                  assessmentId={assessmentId}
                  participantId={participantId}
                  config={assessment.proctoring_config}
                  onSecurityEvent={handleSecurityEvent}
                  onStatusChange={handleProctoringStatusChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pre-assessment setup screens
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Assessment Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {assessment.title}
                </CardTitle>
                <p className="text-muted-foreground mt-1">{assessment.description}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  {assessment.duration_minutes} minutes
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  {assessment.questions.length} questions • {Math.round(100 / assessment.questions.length)}% each
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Session State Content */}
        {sessionState === 'not_started' && !assessment.proctoring_enabled && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Begin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm">
                <p>{assessment.instructions}</p>
              </div>
              <Button onClick={startAssessment} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        )}

        {sessionState === 'not_started' && assessment.proctoring_enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Proctored Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This assessment requires live monitoring. Please ensure you have a webcam, microphone, 
                  and stable internet connection.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-medium">Security Requirements:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {assessment.proctoring_config.cameraRequired && (
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Camera access
                    </div>
                  )}
                  {assessment.proctoring_config.microphoneRequired && (
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Microphone access
                    </div>
                  )}
                  {assessment.proctoring_config.fullscreenRequired && (
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Fullscreen mode
                    </div>
                  )}
                  {assessment.proctoring_config.tabSwitchDetection && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      No tab switching
                    </div>
                  )}
                </div>
              </div>

              <div className="prose prose-sm">
                <p>{assessment.instructions}</p>
              </div>

              <Button onClick={startProctoringSetup} className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Initialize Proctoring
              </Button>
            </CardContent>
          </Card>
        )}

        {sessionState === 'proctoring_setup' && (
          <Card>
            <CardHeader>
              <CardTitle>Setting up Proctoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={setupProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Initializing security monitoring systems...
              </p>
              {setupProgress === 100 && (
                <Button onClick={completeProctoringSetup} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continue to Security Check
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {sessionState === 'proctoring_check' && (
          <Card>
            <CardHeader>
              <CardTitle>Proctoring System Check</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveProctoringSystem
                assessmentId={assessmentId}
                participantId={participantId}
                config={assessment.proctoring_config}
                onSecurityEvent={handleSecurityEvent}
                onStatusChange={handleProctoringStatusChange}
              />
            </CardContent>
          </Card>
        )}

        {sessionState === 'paused' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Assessment Paused</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The assessment has been paused due to security violations. 
                  Please contact your proctor to resume.
                </AlertDescription>
              </Alert>
              
              {securityViolations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Recent Events:</h4>
                  {securityViolations.slice(0, 3).map((violation, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded">
                      <Badge variant="destructive" className="mr-2">
                        {violation.severity}
                      </Badge>
                      {violation.description}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssessmentSession;