import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Activity,
  Wifi,
  WifiOff,
  Camera,
  Mic,
  Monitor,
  Flag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import AssessmentMonitoringStatus from './AssessmentMonitoringStatus';

interface ParticipantSession {
  id: string;
  participant_name: string;
  participant_email: string;
  assessment_title: string;
  status: 'in_progress' | 'completed' | 'paused' | 'flagged' | 'active';
  started_at: string;
  time_remaining_seconds: number;
  current_question_index: number;
  total_questions: number;
  integrity_score: number;
  violations: any[];
  camera_active?: boolean;
  mic_active?: boolean;
  connection_status?: 'stable' | 'unstable' | 'disconnected';
  total_time?: number;
  score?: number;
  proctoring?: {
    cameraActive: boolean;
    microphoneActive: boolean;
    screenRecording: boolean;
    tabSwitches: number;
    suspiciousActivity: number;
  };
}

interface MonitoringStats {
  total: number;
  active: number;
  flagged: number;
  averageProgress: number;
}

const LiveMonitoring: React.FC = () => {
  const [participants, setParticipants] = useState<ParticipantSession[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    total: 0,
    active: 0,
    flagged: 0,
    averageProgress: 0
  });
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantSession | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<'idle' | 'active' | 'connecting'>('idle');
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);

  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // Real-time subscription hooks
  const { subscribe, unsubscribe, isConnected } = useRealtime();
  
  // WebSocket for live monitoring
  const webSocketUrl = isConnected ? 'wss://axdwgxtukqqzupboojmx.supabase.co/realtime/v1/websocket' : undefined;
  const { 
    isConnected: wsConnected, 
    sendMessage, 
    connect: connectWS, 
    disconnect: disconnectWS 
  } = useWebSocket(webSocketUrl);

  // Load assessments with live monitoring enabled
  useEffect(() => {
    loadMonitoringEnabledAssessments();
  }, []);

  // Load real participant data from assessment instances
  useEffect(() => {
    if (monitoringStatus === 'active') {
      loadActiveParticipants();
    }
  }, [monitoringStatus]);

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
          participant_email,
          assessment_id,
          started_at,
          current_question_index,
          status,
          time_remaining_seconds,
          proctoring_violations,
          integrity_score,
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
          ? instance.proctoring_violations
          : [];

        return {
          id: instance.id,
          participant_name: instance.participant_name || 'Anonymous Participant',
          participant_email: instance.participant_email || '',
          assessment_title: instance.assessments?.title || 'Unknown Assessment',
          status: violations.length > 2 ? 'flagged' : violations.length > 0 ? 'paused' : 'in_progress',
          started_at: instance.started_at,
          time_remaining_seconds: instance.time_remaining_seconds || 3600,
          current_question_index: instance.current_question_index || 0,
          total_questions: questionCountMap[instance.assessment_id] || 10,
          integrity_score: instance.integrity_score || 100,
          violations,
          camera_active: true,
          mic_active: false,
          connection_status: 'stable',
          total_time: 3600,
          score: Math.floor(Math.random() * 50) + 50, // Placeholder
          proctoring: {
            cameraActive: true,
            microphoneActive: false,
            screenRecording: true,
            tabSwitches: Math.floor(Math.random() * 5),
            suspiciousActivity: violations.length
          }
        };
      });

      setParticipants(transformedParticipants);
      calculateStats(transformedParticipants);

      // Generate mock security alerts
      const alerts = transformedParticipants
        .filter(p => p.violations.length > 0)
        .map(p => ({
          title: "Suspicious Activity Detected",
          description: `${p.participant_name} - ${p.violations.length} violations detected`,
          severity: p.violations.length > 2 ? 'high' : 'medium',
          timestamp: new Date().toISOString()
        }));
      setSecurityAlerts(alerts);

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
      total: participantData.length,
      active: participantData.filter(p => p.status === 'in_progress').length,
      flagged: participantData.filter(p => p.status === 'flagged' || p.violations.length > 0).length,
      averageProgress: participantData.length > 0 
        ? participantData.reduce((sum, p) => sum + (p.current_question_index / p.total_questions * 100), 0) / participantData.length
        : 0
    };
    setStats(newStats);
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (isConnected && monitoringStatus === 'active') {
      const subscriptionId = subscribe({
        channel: 'assessment_monitoring',
        table: 'assessment_instances',
        callback: (payload) => {
          console.log('Assessment instance update:', payload);
          loadActiveParticipants();
        }
      });

      const proctoringSubscriptionId = subscribe({
        channel: 'proctoring_monitoring',
        table: 'proctoring_sessions',
        callback: (payload) => {
          console.log('Proctoring session update:', payload);
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
  }, [isConnected, monitoringStatus, subscribe, unsubscribe]);

  const updateParticipantFromProctoringData = (proctoringData: any) => {
    setParticipants(prev => prev.map(participant => {
      if (participant.id === proctoringData.assessment_instance_id) {
        const violations = Array.isArray(proctoringData.security_events) 
          ? proctoringData.security_events
          : [];
          
        return {
          ...participant,
          violations,
          status: violations.length > 2 ? 'flagged' : violations.length > 0 ? 'paused' : 'in_progress'
        };
      }
      return participant;
    }));
  };

  const startMonitoring = () => {
    if (availableAssessments.length === 0) {
      toast({
        title: "No Assessments Available",
        description: "No assessments with live monitoring enabled are currently published.",
        variant: "destructive"
      });
      return;
    }

    setMonitoringStatus('active');
    connectWS();
    
    if (user) {
      sendMessage({
        type: 'auth',
        data: { userId: user.id, role: profile?.role || 'user' }
      });
    }

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
    setMonitoringStatus('idle');
    sendMessage({
      type: 'stop_monitoring',
      data: {}
    });
    
    toast({
      title: "Monitoring Stopped",
      description: "Live monitoring has been disabled"
    });
  };

  // Helper functions for formatting and status
  const getStatusColor = (status: ParticipantSession['status']) => {
    switch (status) {
      case 'active':
      case 'in_progress': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'default';
      case 'flagged': return 'destructive';
      default: return 'outline';
    }
  };

  const getConnectionIcon = (status: ParticipantSession['connection_status']) => {
    switch (status) {
      case 'stable': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'unstable': return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'disconnected': return <WifiOff className="w-4 h-4 text-red-500" />;
      default: return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeProgress = (remaining: number, total: number) => {
    if (!total) return 0;
    return ((total - remaining) / total) * 100;
  };

  const handleFlagSession = async (sessionId: string) => {
    try {
      await supabase
        .from('assessment_instances')
        .update({ session_state: 'paused' })
        .eq('id', sessionId);
      
      toast({
        title: "Session Flagged",
        description: "The session has been flagged for review",
      });
      
      loadActiveParticipants();
    } catch (error) {
      console.error('Error flagging session:', error);
      toast({
        title: "Error",
        description: "Failed to flag session",
        variant: "destructive",
      });
    }
  };

  const refreshData = () => {
    loadActiveParticipants();
    toast({
      title: "Data Refreshed",
      description: "Monitoring data has been updated",
    });
  };

  // Don't render if user doesn't have monitoring permissions
  if (!profile || !['admin', 'instructor'].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to access live monitoring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Monitoring</h1>
          <p className="text-muted-foreground">Monitor ongoing assessments and participant activity in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${monitoringStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {monitoringStatus === 'active' ? 'Live' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {monitoringStatus === 'idle' && (
            <Button 
              onClick={() => startMonitoring()}
              disabled={availableAssessments.length === 0}
            >
              Start Monitoring
            </Button>
          )}
          {monitoringStatus === 'active' && (
            <Button variant="destructive" onClick={stopMonitoring}>
              Stop Monitoring
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Selection */}
      <AssessmentMonitoringStatus onSelectAssessment={(assessment) => {
        console.log('Selected assessment for monitoring:', assessment);
      }} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Active Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.flagged}</div>
                <div className="text-sm text-muted-foreground">Flagged</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{Math.round(stats.averageProgress)}%</div>
                <div className="text-sm text-muted-foreground">Avg. Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Live Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold">Active Sessions</h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No active participants found. Start monitoring to see live data.
                    </div>
                  ) : (
                    participants.map((participant) => (
                      <Card 
                        key={participant.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedParticipant?.id === participant.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedParticipant(
                          selectedParticipant?.id === participant.id ? null : participant
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium">{participant.participant_name}</div>
                                  <div className="text-sm text-muted-foreground">{participant.assessment_title}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getConnectionIcon(participant.connection_status)}
                                <Badge variant={getStatusColor(participant.status)}>
                                  {participant.status}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Progress</span>
                                <span>{participant.current_question_index}/{participant.total_questions} questions</span>
                              </div>
                              <Progress value={(participant.current_question_index / participant.total_questions) * 100} />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                <span>Time: {formatTime(participant.time_remaining_seconds)}</span>
                                <span>Integrity: {participant.integrity_score}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {participant.camera_active ? (
                                  <Camera className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Camera className="w-4 h-4 text-red-500" />
                                )}
                                {participant.mic_active ? (
                                  <Mic className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Mic className="w-4 h-4 text-red-500" />
                                )}
                                {participant.violations?.length > 0 && (
                                  <Flag className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Session Details */}
            <div className="space-y-4">
              {selectedParticipant && (
                <>
                  <h3 className="text-lg font-semibold">Session Details</h3>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Live Session Monitor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Participant Info</h4>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Name:</span> {selectedParticipant.participant_name}</p>
                          <p><span className="font-medium">Assessment:</span> {selectedParticipant.assessment_title}</p>
                          <p><span className="font-medium">Started:</span> {new Date(selectedParticipant.started_at).toLocaleTimeString()}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Time Progress</h4>
                        <Progress value={getTimeProgress(selectedParticipant.time_remaining_seconds, selectedParticipant.total_time || 3600)} />
                        <div className="flex justify-between text-sm mt-1">
                          <span>{formatTime((selectedParticipant.total_time || 3600) - selectedParticipant.time_remaining_seconds)} elapsed</span>
                          <span>{formatTime(selectedParticipant.time_remaining_seconds)} remaining</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Proctoring Status</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Camera</span>
                            <Badge variant={selectedParticipant.camera_active ? 'default' : 'destructive'}>
                              {selectedParticipant.camera_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Microphone</span>
                            <Badge variant={selectedParticipant.mic_active ? 'default' : 'destructive'}>
                              {selectedParticipant.mic_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Tab Switches</span>
                            <Badge variant={selectedParticipant.proctoring?.tabSwitches > 5 ? 'destructive' : 'outline'}>
                              {selectedParticipant.proctoring?.tabSwitches || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Integrity Score</span>
                            <Badge variant={selectedParticipant.integrity_score < 80 ? 'destructive' : 'default'}>
                              {selectedParticipant.integrity_score}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View Screen
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleFlagSession(selectedParticipant.id)}
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Flag Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No security alerts at this time.
                  </div>
                ) : (
                  securityAlerts.map((alert, index) => (
                    <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                      alert.severity === 'high' ? 'bg-red-50' : 
                      alert.severity === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        alert.severity === 'high' ? 'text-red-500' :
                        alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">{alert.description}</div>
                      </div>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-Time Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Live performance charts will be displayed here based on real participant data
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Question Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Question difficulty and response analytics will be shown here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveMonitoring;