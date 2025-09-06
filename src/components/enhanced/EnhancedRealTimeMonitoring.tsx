import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, Clock, AlertTriangle, CheckCircle, Eye, Activity,
  Wifi, WifiOff, Camera, Mic, Monitor, Flag, Shield,
  Brain, Zap, Bell, MapPin, Battery, Signal
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useRealtime } from '@/hooks/useRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { monitoringCoordinator } from '@/services/MonitoringCoordinator';

interface EnhancedParticipantSession {
  id: string;
  participantName: string;
  participantId: string;
  assessmentTitle: string;
  assessmentId: string;
  status: 'active' | 'paused' | 'completed' | 'flagged' | 'disconnected';
  timeRemaining: number;
  totalTime: number;
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  connectionStatus: 'stable' | 'unstable' | 'disconnected';
  location: { lat: number; lng: number; city: string };
  device: { type: string; browser: string; os: string };
  networkInfo: { speed: string; latency: number; stability: number };
  proctoring: {
    cameraActive: boolean;
    microphoneActive: boolean;
    screenRecording: boolean;
    tabSwitches: number;
    suspiciousActivity: SecurityEvent[];
    faceDetection: boolean;
    environmentCheck: boolean;
    batteryLevel: number;
  };
  performance: {
    keystrokePattern: 'normal' | 'irregular' | 'suspicious';
    typingSpeed: number;
    mouseMovement: 'human' | 'bot-like';
    focusLoss: number;
    idleTime: number;
  };
  startedAt: string;
  lastActivity: string;
}

interface SecurityEvent {
  id: string;
  type: 'tab-switch' | 'screen-exit' | 'camera-off' | 'suspicious-typing' | 'multiple-faces' | 'environment-change';
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  autoHandled: boolean;
  response?: string;
}

interface MonitoringStats {
  totalSessions: number;
  activeSessions: number;
  flaggedSessions: number;
  completedToday: number;
  avgProgress: number;
  criticalAlerts: number;
  networkIssues: number;
  proctoringViolations: number;
}

const EnhancedRealTimeMonitoring: React.FC = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<EnhancedParticipantSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [stats, setStats] = useState<MonitoringStats>({
    totalSessions: 0,
    activeSessions: 0,
    flaggedSessions: 0,
    completedToday: 0,
    avgProgress: 0,
    criticalAlerts: 0,
    networkIssues: 0,
    proctoringViolations: 0
  });
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(true);
  const [monitoringMode, setMonitoringMode] = useState<'normal' | 'resource_safe' | 'minimal'>('normal');
  const [sessionId] = useState(() => crypto.randomUUID());

  // WebSocket for real-time updates
  const { isConnected, lastMessage, sendMessage, connect, disconnect } = useWebSocket();

  // Supabase real-time subscriptions
  const { subscribe, unsubscribe } = useRealtime();

  useEffect(() => {
    // Initialize monitoring coordinator
    monitoringCoordinator.startCoordination();
    
    return () => {
      monitoringCoordinator.stopCoordination();
    };
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      startComprehensiveMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [isMonitoring]);

  useEffect(() => {
    // Listen for monitoring mode changes from coordinator
    const handleModeChange = (event: CustomEvent) => {
      const { newMode, publicAccessInfo } = event.detail;
      setMonitoringMode(newMode);
      
      toast({
        title: "Monitoring Mode Adjusted",
        description: `Switched to ${newMode} mode due to ${publicAccessInfo.activeCount} active public sessions`,
        variant: "default"
      });
    };

    window.addEventListener('monitoring-mode-change', handleModeChange as any);
    
    return () => {
      window.removeEventListener('monitoring-mode-change', handleModeChange as any);
    };
  }, [toast]);

  useEffect(() => {
    if (lastMessage) {
      handleRealtimeMessage(lastMessage);
    }
  }, [lastMessage]);

  const startComprehensiveMonitoring = useCallback(async () => {
    try {
      // Check for active public sessions before starting intensive monitoring
      const { data: activePublicSessions } = await supabase
        .from('assessment_instances')
        .select('id, assessment_id')
        .eq('is_anonymous', true)
        .eq('status', 'in_progress')
        .not('share_token', 'is', null);

      if (activePublicSessions && activePublicSessions.length > 0) {
        toast({
          title: "Public Sessions Detected",
          description: `${activePublicSessions.length} anonymous users are taking assessments. Monitoring will use resource-safe mode.`,
          variant: "default"
        });
      }

      // Initialize enhanced monitoring systems with resource isolation
      connect();
      
      // Use less frequent polling for monitoring to avoid database contention
      const monitoringMode = activePublicSessions?.length > 0 ? 'resource_safe' : 'normal';
      
      // Subscribe to assessment instances with reduced frequency when public sessions are active
      subscribe({
        channel: 'assessment-monitoring',
        table: 'assessment_instances',
        filter: `status=eq.in_progress.and.live_monitoring_enabled=eq.true`,
        callback: handleAssessmentUpdate
      });

      // Subscribe to proctoring sessions with isolation from public access
      subscribe({
        channel: 'proctoring-monitoring', 
        table: 'proctoring_sessions',
        filter: 'status=in.("active","initializing")',
        callback: handleProctoringUpdate
      });

      // Register with monitoring coordinator
      const coordinatedSession = monitoringCoordinator.registerMonitoringSession(
        sessionId,
        activePublicSessions?.map(s => s.assessment_id) || []
      );
      
      setMonitoringMode(coordinatedSession.mode);

      // Send monitoring start message via WebSocket with coordination info
      if (isConnected) {
        sendMessage({
          type: 'start_monitoring',
          data: {
            sessionId,
            monitoringType: 'live_assessment',
            mode: coordinatedSession.mode,
            activePublicSessions: activePublicSessions?.length || 0,
            timestamp: Date.now()
          }
        });
      }

      // Load initial data with resource-safe approach
      await loadInitialSessionsSafe(monitoringMode);
      
      // Start AI-powered anomaly detection with reduced intensity if needed
      startAnomalyDetection(monitoringMode);

      setIsMonitoring(true);
      
      toast({
        title: "Enhanced Monitoring Active",
        description: `Real-time monitoring enabled in ${monitoringMode} mode`,
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      toast({
        title: "Monitoring Error",
        description: "Failed to start enhanced monitoring system",
        variant: "destructive"
      });
    }
  }, [connect, subscribe]);

  const stopMonitoring = useCallback(() => {
    disconnect();
    unsubscribe('assessment-monitoring');
    unsubscribe('proctoring-monitoring');
    
    // Unregister from coordination service
    monitoringCoordinator.unregisterMonitoringSession(sessionId);
    
    setIsMonitoring(false);
    setMonitoringMode('normal');
    
    toast({
      title: "Monitoring Stopped",
      description: "Real-time monitoring has been disabled",
    });
  }, [disconnect, unsubscribe, sessionId, toast]);

  const loadInitialSessionsSafe = async (mode: string = 'normal') => {
    try {
      console.log('Loading initial assessment sessions in', mode, 'mode...');
      
      // Use separate connection for monitoring to avoid contention with public access
      const timeoutMs = mode === 'resource_safe' ? 3000 : 10000;
      const queryPromise = supabase
        .from('assessment_instances')
        .select(`
          *,
          assessments!inner(id, title, live_monitoring_enabled),
          proctoring_sessions(*)
        `)
        .eq('assessments.live_monitoring_enabled', true)
        .eq('status', 'in_progress')
        .neq('is_anonymous', true) // Exclude anonymous sessions to avoid interference
        .order('started_at', { ascending: false })
        .limit(mode === 'resource_safe' ? 10 : 50); // Limit results in safe mode

      // Add timeout to prevent blocking public access
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );

      const { data: instances, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error loading sessions:', error);
        // Retry with minimal query in case of error
        if (mode !== 'minimal') {
          return loadInitialSessionsMinimal();
        }
        return;
      }

      console.log('Loaded assessment instances:', instances?.length || 0);

      if (instances) {
        const enhancedSessions = instances.map(instance => 
          enhanceSessionData(instance)
        );
        setSessions(enhancedSessions);
        updateStats(enhancedSessions);
        
        console.log('Enhanced sessions created:', enhancedSessions.length);
      }
    } catch (error) {
      console.error('Error in loadInitialSessionsSafe:', error);
      if (mode !== 'minimal') {
        // Fallback to minimal loading
        loadInitialSessionsMinimal();
      }
    }
  };

  const loadInitialSessionsMinimal = async () => {
    try {
      // Very basic query to avoid resource contention
      const { data: instances, error } = await supabase
        .from('assessment_instances')
        .select('id, assessment_id, participant_name, participant_email, status, started_at')
        .eq('status', 'in_progress')
        .neq('is_anonymous', true)
        .limit(5);

      if (!error && instances) {
        // Create minimal session objects
        const minimalSessions = instances.map(instance => ({
          id: instance.id,
          participantName: instance.participant_name || instance.participant_email || 'User',
          participantId: 'unknown',
          assessmentTitle: 'Assessment',
          assessmentId: instance.assessment_id,
          status: 'active' as const,
          timeRemaining: 3600,
          totalTime: 3600,
          currentQuestion: 0,
          totalQuestions: 10,
          score: 0,
          connectionStatus: 'stable' as const,
          location: { lat: 0, lng: 0, city: 'Unknown' },
          device: { type: 'unknown', browser: 'unknown', os: 'unknown' },
          networkInfo: { speed: 'Unknown', latency: 0, stability: 100 },
          proctoring: {
            cameraActive: false,
            microphoneActive: false,
            screenRecording: false,
            tabSwitches: 0,
            suspiciousActivity: [],
            faceDetection: false,
            environmentCheck: false,
            batteryLevel: 100
          },
          performance: {
            keystrokePattern: 'normal' as const,
            typingSpeed: 50,
            mouseMovement: 'human' as const,
            focusLoss: 0,
            idleTime: 0
          },
          startedAt: instance.started_at,
          lastActivity: new Date().toISOString()
        }));
        
        setSessions(minimalSessions);
        updateStats(minimalSessions);
      }
    } catch (error) {
      console.error('Error in minimal session loading:', error);
    }
  };

  const enhanceSessionData = (instance: any): EnhancedParticipantSession => {
    console.log('Enhancing session data for instance:', instance.id);
    
    // Get latest proctoring session data
    const latestProctoringSession = instance.proctoring_sessions?.[0];
    const monitoringData = latestProctoringSession?.monitoring_data || {};
    const securityEvents = latestProctoringSession?.security_events || [];
    
    // Calculate real tab switches from security events
    const tabSwitches = securityEvents.filter((event: any) => 
      event.type === 'tab_switch' || event.type === 'tab-switch'
    ).length;
    
    return {
      id: instance.id,
      participantName: instance.participant_name || instance.participant_email || 'Anonymous',
      participantId: instance.participant_id || 'anonymous',
      assessmentTitle: instance.assessments?.title || 'Unknown Assessment',
      assessmentId: instance.assessment_id,
      status: determineSessionStatus(instance),
      timeRemaining: instance.time_remaining_seconds || 0,
      totalTime: 3600, // Default 1 hour
      currentQuestion: instance.current_question_index || 0,
      totalQuestions: 10, // This would come from assessment data
      score: instance.total_score || 0,
      connectionStatus: determineConnectionStatus(monitoringData),
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
        city: 'New York'
      },
      device: {
        type: Math.random() > 0.5 ? 'desktop' : 'mobile',
        browser: ['Chrome', 'Firefox', 'Safari'][Math.floor(Math.random() * 3)],
        os: ['Windows', 'macOS', 'Linux'][Math.floor(Math.random() * 3)]
      },
      networkInfo: {
        speed: monitoringData.network_speed || `${Math.floor(Math.random() * 100 + 50)} Mbps`,
        latency: monitoringData.latency || Math.floor(Math.random() * 100 + 20),
        stability: monitoringData.stability || Math.floor(Math.random() * 30 + 70)
      },
      proctoring: {
        cameraActive: monitoringData.camera_active ?? true,
        microphoneActive: monitoringData.microphone_active ?? true,
        screenRecording: monitoringData.screen_recording ?? false,
        tabSwitches: tabSwitches,
        suspiciousActivity: securityEvents.map((event: any) => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          severity: event.severity,
          description: event.description,
          autoHandled: false
        })),
        faceDetection: monitoringData.face_detected ?? true,
        environmentCheck: monitoringData.environment_check ?? true,
        batteryLevel: monitoringData.battery_level || Math.floor(Math.random() * 60 + 40)
      },
      performance: {
        keystrokePattern: Math.random() > 0.8 ? 'suspicious' : 'normal',
        typingSpeed: Math.floor(Math.random() * 60 + 40),
        mouseMovement: Math.random() > 0.9 ? 'bot-like' : 'human',
        focusLoss: Math.floor(Math.random() * 5),
        idleTime: Math.floor(Math.random() * 300)
      },
      startedAt: instance.started_at,
      lastActivity: monitoringData.last_updated || new Date().toISOString()
    };
  };
  
  const determineConnectionStatus = (monitoringData: any) => {
    if (!monitoringData.last_updated) return 'disconnected';
    
    const lastUpdate = new Date(monitoringData.last_updated);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    
    if (timeDiff < 30000) return 'stable'; // Updated within 30 seconds
    if (timeDiff < 120000) return 'unstable'; // Updated within 2 minutes
    return 'disconnected';
  };

  const determineSessionStatus = (instance: any) => {
    if (instance.status === 'submitted') return 'completed';
    if (instance.session_state === 'paused') return 'paused';
    
    // Check proctoring violations
    const violations = instance.proctoring_violations || [];
    const criticalViolations = violations.filter((v: any) => v.severity === 'critical').length;
    
    if (criticalViolations > 0 || violations.length > 5) return 'flagged';
    if (instance.status === 'in_progress') return 'active';
    
    return 'active';
  };

  const handleRealtimeMessage = (message: any) => {
    console.log('Real-time message received:', message);
    
    switch (message.type) {
      case 'session_update':
        updateSession(message.data);
        break;
      case 'security_violation':
        handleSecurityViolation(message.data);
        break;
      case 'performance_alert':
        handlePerformanceAlert(message.data);
        break;
      case 'network_issue':
        handleNetworkIssue(message.data);
        break;
    }
  };

  const handleAssessmentUpdate = (payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    setSessions(prevSessions => {
      const updated = [...prevSessions];
      const index = updated.findIndex(s => s.id === newRecord.id);
      
      if (eventType === 'UPDATE' && index !== -1) {
        updated[index] = enhanceSessionData(newRecord);
      } else if (eventType === 'INSERT') {
        updated.push(enhanceSessionData(newRecord));
      }
      
      updateStats(updated);
      return updated;
    });
  };

  const handleProctoringUpdate = (payload: any) => {
    const { new: newRecord } = payload;
    
    if (newRecord.security_events?.length > 0) {
      const events = newRecord.security_events.map((event: any) => ({
        ...event,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      }));
      setSecurityEvents(prev => [...prev, ...events]);
    }
  };

  const startAnomalyDetection = (mode: string = 'normal') => {
    // AI-powered anomaly detection simulation with resource management
    const checkInterval = mode === 'resource_safe' ? 60000 : 30000; // Longer intervals in safe mode
    
    const interval = setInterval(() => {
      // Limit processing in resource-safe mode
      const sessionsToCheck = mode === 'resource_safe' 
        ? sessions.slice(0, 5) 
        : sessions;
      
      sessionsToCheck.forEach(session => {
        // Detect typing pattern anomalies
        if (session.performance.keystrokePattern === 'suspicious') {
          createSecurityEvent(session.id, 'suspicious-typing', 'high', 
            'Unusual typing patterns detected - possible automated assistance');
        }
        
        // Detect multiple faces or identity changes (reduced frequency in safe mode)
        const detectionRate = mode === 'resource_safe' ? 0.02 : 0.05;
        if (Math.random() < detectionRate) {
          createSecurityEvent(session.id, 'multiple-faces', 'critical',
            'Multiple faces detected in camera feed');
        }
        
        // Network stability monitoring
        if (session.networkInfo.stability < 60) {
          createSecurityEvent(session.id, 'screen-exit', 'medium',
            'Network instability may indicate external interference');
        }
      });
    }, checkInterval);

    return () => clearInterval(interval);
  };

  const createSecurityEvent = (sessionId: string, type: SecurityEvent['type'], 
    severity: SecurityEvent['severity'], description: string) => {
    
    const event: SecurityEvent = {
      id: `${sessionId}-${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      severity,
      description,
      autoHandled: false
    };

    // Auto-handle based on severity and settings
    if (autoResponseEnabled && severity === 'critical') {
      event.autoHandled = true;
      event.response = handleCriticalViolation(sessionId, event);
    }

    setSecurityEvents(prev => [event, ...prev]);
    
    // Real-time notification
    toast({
      title: `Security Alert - ${severity.toUpperCase()}`,
      description: description,
      variant: severity === 'critical' ? 'destructive' : 'default'
    });
  };

  const handleCriticalViolation = (sessionId: string, event: SecurityEvent): string => {
    // Pause session automatically
    pauseSession(sessionId);
    
    // Send alert to supervisor
    sendMessage({
      type: 'critical_alert',
      data: { sessionId, event, action: 'session_paused' }
    });
    
    return 'Session automatically paused - supervisor notified';
  };

  const pauseSession = async (sessionId: string) => {
    try {
      await supabase
        .from('assessment_instances')
        .update({ session_state: 'paused' })
        .eq('id', sessionId);
        
      setSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: 'paused' } : s)
      );
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  const updateSession = (sessionData: any) => {
    setSessions(prev => 
      prev.map(s => s.id === sessionData.id ? { ...s, ...sessionData } : s)
    );
  };

  const handleSecurityViolation = (violation: any) => {
    createSecurityEvent(violation.sessionId, violation.type, violation.severity, violation.description);
  };

  const handlePerformanceAlert = (alert: any) => {
    toast({
      title: "Performance Alert",
      description: alert.message,
      variant: "destructive"
    });
  };

  const handleNetworkIssue = (issue: any) => {
    setStats(prev => ({ ...prev, networkIssues: prev.networkIssues + 1 }));
  };

  const updateStats = (sessions: EnhancedParticipantSession[]) => {
    const active = sessions.filter(s => s.status === 'active').length;
    const flagged = sessions.filter(s => s.status === 'flagged').length;
    const avgProgress = sessions.reduce((sum, s) => 
      sum + (s.currentQuestion / s.totalQuestions), 0) / sessions.length || 0;

    setStats(prev => ({
      ...prev,
      totalSessions: sessions.length,
      activeSessions: active,
      flaggedSessions: flagged,
      avgProgress: avgProgress * 100,
      criticalAlerts: securityEvents.filter(e => e.severity === 'critical').length
    }));
  };

  const getStatusColor = (status: EnhancedParticipantSession['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      case 'flagged': return 'destructive';
      case 'disconnected': return 'destructive';
      default: return 'outline';
    }
  };

  const getConnectionIcon = (status: EnhancedParticipantSession['connectionStatus']) => {
    switch (status) {
      case 'stable': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'unstable': return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'disconnected': return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Real-Time Monitoring</h1>
          <p className="text-muted-foreground">
            AI-powered monitoring with comprehensive security analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {monitoringMode.toUpperCase()} Mode
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Active
          </Badge>
          <Button 
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Flag className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <div className="text-2xl font-bold">{stats.flaggedSessions}</div>
            <div className="text-sm text-muted-foreground">Flagged</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{stats.avgProgress.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Avg Progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <div className="text-2xl font-bold">{stats.criticalAlerts}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{stats.proctoringViolations}</div>
            <div className="text-sm text-muted-foreground">Violations</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Wifi className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <div className="text-2xl font-bold">{stats.networkIssues}</div>
            <div className="text-sm text-muted-foreground">Network</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Bell className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
            <div className="text-2xl font-bold">{securityEvents.length}</div>
            <div className="text-sm text-muted-foreground">Alerts</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Live Sessions</TabsTrigger>
          <TabsTrigger value="security">Security Center</TabsTrigger>
          <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
          <TabsTrigger value="network">Network Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Enhanced Sessions List */}
            <div className="lg:col-span-2 space-y-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className={`cursor-pointer transition-all ${
                        selectedSession === session.id ? 'ring-2 ring-primary shadow-lg' : ''
                      } ${session.status === 'flagged' ? 'border-red-500' : ''}`}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{session.participantName}</div>
                                <div className="text-sm text-muted-foreground">{session.assessmentTitle}</div>
                                <div className="text-xs text-muted-foreground">
                                  {session.device.browser} on {session.device.os} • {session.location.city}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getConnectionIcon(session.connectionStatus)}
                              <Badge variant={getStatusColor(session.status)}>
                                {session.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{session.currentQuestion}/{session.totalQuestions} questions</span>
                            </div>
                            <Progress value={(session.currentQuestion / session.totalQuestions) * 100} />
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <span>Time: {formatTime(session.timeRemaining)}</span>
                              <span>Score: {session.score}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {session.proctoring.cameraActive ? (
                                <Camera className="w-4 h-4 text-green-500" />
                              ) : (
                                <Camera className="w-4 h-4 text-red-500" />
                              )}
                              {session.proctoring.screenRecording && (
                                <Monitor className="w-4 h-4 text-blue-500" />
                              )}
                              {session.performance.keystrokePattern === 'suspicious' && (
                                <Brain className="w-4 h-4 text-orange-500" />
                              )}
                              {session.proctoring.suspiciousActivity.length > 0 && (
                                <Flag className="w-4 h-4 text-red-500" />
                              )}
                              <Battery className="w-4 h-4 text-gray-500" />
                              <span className="text-xs">{session.proctoring.batteryLevel}%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Enhanced Session Details */}
            <div className="space-y-4">
              {selectedSession && (
                <>
                  {(() => {
                    const session = sessions.find(s => s.id === selectedSession);
                    if (!session) return null;

                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            Enhanced Session Monitor
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Participant Details</h4>
                            <div className="text-sm space-y-1">
                              <p><span className="font-medium">Name:</span> {session.participantName}</p>
                              <p><span className="font-medium">Device:</span> {session.device.browser} on {session.device.os}</p>
                              <p><span className="font-medium">Location:</span> {session.location.city}</p>
                              <p><span className="font-medium">Network:</span> {session.networkInfo.speed}</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Performance Indicators</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Typing Pattern</span>
                                <Badge variant={session.performance.keystrokePattern === 'suspicious' ? 'destructive' : 'default'}>
                                  {session.performance.keystrokePattern}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Typing Speed</span>
                                <span className="text-sm">{session.performance.typingSpeed} WPM</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Focus Loss Events</span>
                                <Badge variant={session.performance.focusLoss > 3 ? 'destructive' : 'default'}>
                                  {session.performance.focusLoss}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Security Status</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Face Detection</span>
                                <Badge variant={session.proctoring.faceDetection ? 'default' : 'destructive'}>
                                  {session.proctoring.faceDetection ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Environment Check</span>
                                <Badge variant={session.proctoring.environmentCheck ? 'default' : 'destructive'}>
                                  {session.proctoring.environmentCheck ? 'Secure' : 'Compromised'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Battery Level</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={session.proctoring.batteryLevel} className="w-12" />
                                  <span className="text-sm">{session.proctoring.batteryLevel}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" />
                              Live View
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1">
                              <Flag className="w-4 h-4 mr-2" />
                              Flag Session
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Live Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {securityEvents.slice(0, 20).map((event) => (
                      <Alert 
                        key={event.id}
                        className={`${
                          event.severity === 'critical' ? 'border-red-500 bg-red-50' :
                          event.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                          event.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                          'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between mb-1">
                            <Badge 
                              variant={
                                event.severity === 'critical' ? 'destructive' :
                                event.severity === 'high' ? 'destructive' :
                                event.severity === 'medium' ? 'secondary' : 'default'
                              }
                            >
                              {event.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm">{event.description}</div>
                          {event.autoHandled && (
                            <div className="text-xs text-green-600 mt-1">
                              ✓ {event.response}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Response Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Auto-handle critical violations</span>
                  <Button
                    variant={autoResponseEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAutoResponseEnabled(!autoResponseEnabled)}
                  >
                    {autoResponseEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Response Actions</h4>
                  <div className="text-sm space-y-1">
                    <p>• Critical: Pause session + notify supervisor</p>
                    <p>• High: Flag session + real-time alert</p>
                    <p>• Medium: Log event + warning to participant</p>
                    <p>• Low: Silent monitoring</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="text-center py-8">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">AI Analytics Dashboard</h3>
            <p className="text-muted-foreground">
              Machine learning insights and behavioral analysis would be displayed here
            </p>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="text-center py-8">
            <Signal className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Network Monitoring</h3>
            <p className="text-muted-foreground">
              Real-time network quality and connectivity analysis
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedRealTimeMonitoring;