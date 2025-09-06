import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Video,
  Mic,
  Monitor,
  Activity,
  Shield,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AssessmentMonitoringStatus from './AssessmentMonitoringStatus';

interface ParticipantSession {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  assessmentId: string;
  startedAt: string;
  currentQuestion: number;
  totalQuestions: number;
  status: 'active' | 'suspicious' | 'flagged' | 'completed';
  violations: string[];
  lastActivity: string;
  isRecording: boolean;
  screenShare: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
}

interface MonitoringStats {
  totalParticipants: number;
  activeParticipants: number;
  flaggedParticipants: number;
  completedParticipants: number;
  averageProgress: number;
}

const LiveMonitoring = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { isConnected, subscribe, unsubscribe } = useRealtime();
  const { sendMessage, lastMessage, connect: connectWS, isConnected: wsConnected } = useWebSocket(
    `wss://axdwgxtukqqzupboojmx.supabase.co/functions/v1/realtime-proctoring`
  );

  // Check if user has monitoring permissions
  const hasMonitoringPermissions = profile?.role === 'admin' || profile?.role === 'instructor';
  
  const [participants, setParticipants] = useState<ParticipantSession[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    totalParticipants: 0,
    activeParticipants: 0,
    flaggedParticipants: 0,
    completedParticipants: 0,
    averageProgress: 0
  });
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);

  // Load assessments with live monitoring enabled
  useEffect(() => {
    loadMonitoringEnabledAssessments();
  }, []);

  // Load real participant data from assessment instances
  useEffect(() => {
    if (isMonitoring) {
      loadActiveParticipants();
    }
  }, [isMonitoring]);

  const loadMonitoringEnabledAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, description, live_monitoring_enabled, status')
        .eq('live_monitoring_enabled', true)
        .eq('status', 'published');

      if (error) throw error;
      setAvailableAssessments(data || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load monitoring-enabled assessments",
        variant: "destructive"
      });
    }
  };

  const loadActiveParticipants = async () => {
    try {
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          participant_id,
          participant_name,
          assessment_id,
          started_at,
          current_question_index,
          status,
          time_remaining_seconds,
          proctoring_violations,
          assessments!assessment_instances_assessment_id_fkey(
            id,
            title,
            live_monitoring_enabled
          )
        `)
        .eq('assessments.live_monitoring_enabled', true)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (error) throw error;
      
      // Get question counts for each assessment
      const assessmentIds = [...new Set((instances || []).map(i => i.assessment_id))];
      const { data: questionCounts } = await supabase
        .from('questions')
        .select('assessment_id')
        .in('assessment_id', assessmentIds);

      const questionCountMap = questionCounts?.reduce((acc: any, q: any) => {
        acc[q.assessment_id] = (acc[q.assessment_id] || 0) + 1;
        return acc;
      }, {}) || {};

      // Transform the data to match our ParticipantSession interface
      const transformedParticipants: ParticipantSession[] = (instances || []).map(instance => {
        const violations = Array.isArray(instance.proctoring_violations) 
          ? instance.proctoring_violations.map((v: any) => v.description || v.type || 'Unknown violation')
          : [];

        return {
          id: instance.id,
          userId: instance.participant_id || `anon_${instance.id}`,
          userName: instance.participant_name || 'Anonymous Participant',
          assessmentId: instance.assessment_id,
          startedAt: instance.started_at,
          currentQuestion: (instance.current_question_index || 0) + 1,
          totalQuestions: questionCountMap[instance.assessment_id] || 10,
          status: violations.length > 2 ? 'flagged' : violations.length > 0 ? 'suspicious' : 'active',
          violations,
          lastActivity: new Date().toISOString(),
          isRecording: true, // Default for active sessions
          screenShare: false, // Will be updated from proctoring data
          cameraEnabled: true,
          micEnabled: true
        };
      });

      setParticipants(transformedParticipants);
      calculateStats(transformedParticipants);

    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: "Error",
        description: "Failed to load active participants",
        variant: "destructive"
      });
    }
  };

  const calculateStats = (participantData: ParticipantSession[]) => {
    const newStats: MonitoringStats = {
      totalParticipants: participantData.length,
      activeParticipants: participantData.filter(p => p.status === 'active').length,
      flaggedParticipants: participantData.filter(p => p.status === 'suspicious' || p.status === 'flagged').length,
      completedParticipants: participantData.filter(p => p.status === 'completed').length,
      averageProgress: participantData.length > 0 
        ? participantData.reduce((sum, p) => sum + (p.currentQuestion / p.totalQuestions * 100), 0) / participantData.length
        : 0
    };
    setStats(newStats);
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (isConnected && isMonitoring) {
      const subscriptionId = subscribe({
        channel: 'assessment_monitoring',
        table: 'assessment_instances',
        callback: (payload) => {
          console.log('Assessment instance update:', payload);
          // Reload participants when data changes
          loadActiveParticipants();
        }
      });

      const proctoringSubscriptionId = subscribe({
        channel: 'proctoring_monitoring',
        table: 'proctoring_sessions',
        callback: (payload) => {
          console.log('Proctoring session update:', payload);
          // Handle proctoring updates
          if (payload.eventType === 'UPDATE' && payload.new) {
            updateParticipantFromProctoringData(payload.new);
          }
        }
      });

      return () => {
        if (subscriptionId) unsubscribe(subscriptionId);
        if (proctoringSubscriptionId) unsubscribe(proctoringSubscriptionId);
      };
    }
  }, [isConnected, isMonitoring, subscribe, unsubscribe]);

  const updateParticipantFromProctoringData = (proctoringData: any) => {
    setParticipants(prev => prev.map(participant => {
      if (participant.id === proctoringData.assessment_instance_id) {
        const violations = Array.isArray(proctoringData.security_events) 
          ? proctoringData.security_events.map((e: any) => e.description || e.type || 'Security event')
          : [];
          
        return {
          ...participant,
          violations,
          status: violations.length > 2 ? 'flagged' : violations.length > 0 ? 'suspicious' : 'active',
          lastActivity: new Date().toISOString()
        };
      }
      return participant;
    }));
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'violation_detected':
          // Handle proctoring violations
          console.log('Violation detected:', lastMessage.data);
          break;
        case 'participant_activity':
          // Handle participant activity updates
          console.log('Participant activity:', lastMessage.data);
          break;
      }
    }
  }, [lastMessage]);

  const startMonitoring = () => {
    if (availableAssessments.length === 0) {
      toast({
        title: "No Assessments Available",
        description: "No assessments with live monitoring enabled are currently published.",
        variant: "destructive"
      });
      return;
    }

    setIsMonitoring(true);
    connectWS();
    
    // Authenticate with WebSocket
    if (user) {
      sendMessage({
        type: 'auth',
        data: { userId: user.id, role: profile?.role || 'user' }
      });
    }

    // Start monitoring all available assessments
    sendMessage({
      type: 'start_monitoring',
      data: { 
        assessmentIds: availableAssessments.map(a => a.id),
        monitoringType: 'live_assessment' 
      }
    });

    toast({
      title: "Monitoring Started",
      description: `Now monitoring ${availableAssessments.length} assessment(s)`
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    sendMessage({
      type: 'stop_monitoring',
      data: {}
    });
    
    toast({
      title: "Monitoring Stopped",
      description: "Live monitoring has been disabled"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'suspicious': return 'secondary';
      case 'flagged': return 'destructive';
      case 'completed': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'suspicious': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'flagged': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const selectedParticipantData = participants.find(p => p.id === selectedParticipant);

  // Access control check
  if (!hasMonitoringPermissions) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You need administrator or instructor permissions to access live monitoring.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assessment Monitoring Status */}
      <AssessmentMonitoringStatus 
        onSelectAssessment={(assessmentId) => {
          // TODO: Filter monitoring by specific assessment
          console.log('Selected assessment for monitoring:', assessmentId);
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Monitoring</h2>
          <p className="text-muted-foreground">Real-time assessment monitoring and proctoring</p>
          {availableAssessments.length > 0 && (
            <p className="text-sm text-green-600 mt-1">
              {availableAssessments.length} assessment(s) available for monitoring
            </p>
          )}
          {availableAssessments.length === 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              No assessments with live monitoring enabled found
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={wsConnected ? 'default' : 'secondary'}>
            {wsConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {!isMonitoring ? (
            <Button onClick={startMonitoring} className="gap-2">
              <Play className="w-4 h-4" />
              Start Monitoring
            </Button>
          ) : (
            <Button onClick={stopMonitoring} variant="outline" className="gap-2">
              <Square className="w-4 h-4" />
              Stop Monitoring
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold">{stats.totalParticipants}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeParticipants}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-red-600">{stats.flaggedParticipants}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold">{stats.averageProgress.toFixed(0)}%</p>
              </div>
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Active Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedParticipant === participant.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedParticipant(participant.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>{participant.userName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{participant.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          Question {participant.currentQuestion} of {participant.totalQuestions}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(participant.status)}
                      <Badge variant={getStatusColor(participant.status)}>
                        {participant.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Progress 
                      value={(participant.currentQuestion / participant.totalQuestions) * 100} 
                      className="h-2"
                    />
                  </div>

                  {participant.violations.length > 0 && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {participant.violations.length} violation(s) detected
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Participant Details */}
        <Card>
          <CardHeader>
            <CardTitle>Participant Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedParticipantData ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedParticipantData.avatar} />
                    <AvatarFallback>{selectedParticipantData.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedParticipantData.userName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Started: {new Date(selectedParticipantData.startedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Video className={`w-4 h-4 ${selectedParticipantData.cameraEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm">Camera</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mic className={`w-4 h-4 ${selectedParticipantData.micEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm">Microphone</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Monitor className={`w-4 h-4 ${selectedParticipantData.screenShare ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm">Screen Share</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className={`w-4 h-4 ${selectedParticipantData.isRecording ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className="text-sm">Recording</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Assessment Progress</h4>
                  <Progress 
                    value={(selectedParticipantData.currentQuestion / selectedParticipantData.totalQuestions) * 100} 
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Question {selectedParticipantData.currentQuestion} of {selectedParticipantData.totalQuestions}
                  </p>
                </div>

                {selectedParticipantData.violations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Violations Detected</h4>
                      <div className="space-y-1">
                        {selectedParticipantData.violations.map((violation, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span className="text-sm">{violation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Screen
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mic className="w-4 h-4 mr-2" />
                    Listen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Select a participant to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveMonitoring;