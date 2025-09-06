import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Eye, 
  Camera, 
  Mic, 
  Monitor, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  Square,
  Wifi,
  WifiOff,
  Battery,
  Clock,
  Maximize,
  Minimize
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProctoringConfig {
  cameraRequired: boolean;
  microphoneRequired: boolean;
  screenSharing: boolean;
  tabSwitchDetection: boolean;
  fullscreenRequired: boolean;
  faceDetection: boolean;
  voiceAnalysis: boolean;
  environmentCheck: boolean;
  browserLockdown: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'camera_blocked' | 'mic_muted' | 'face_not_detected' | 'suspicious_activity' | 'network_issue';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
}

interface LiveProctoringSystemProps {
  assessmentId: string;
  participantId: string;
  config: ProctoringConfig;
  onSecurityEvent: (event: SecurityEvent) => void;
  onStatusChange: (status: 'active' | 'paused' | 'stopped') => void;
}

const LiveProctoringSystem: React.FC<LiveProctoringSystemProps> = ({
  assessmentId,
  participantId,
  config,
  onSecurityEvent,
  onStatusChange
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<'initializing' | 'active' | 'paused' | 'stopped'>('initializing');
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    screen: false
  });
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unstable'>('online');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [proctoringSessionId, setProctoringSessionId] = useState<string | null>(null);

  useEffect(() => {
    initializeProctoring();
    setupEventListeners();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeProctoring = async () => {
    try {
      console.log('Initializing proctoring system...');
      await requestPermissions();
      await setupDeviceMonitoring();
      await initializeWebSocketConnection();
      await createOrUpdateProctoringSession();
      
      setStatus('active');
      onStatusChange('active');
      
      // Start periodic status updates
      startPeriodicStatusUpdates();
      
      toast({
        title: "Proctoring Active",
        description: "Live monitoring has been successfully initialized.",
      });
    } catch (error) {
      console.error('Failed to initialize proctoring:', error);
      toast({
        title: "Initialization Failed",
        description: "Could not start proctoring. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const initializeWebSocketConnection = () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const wsUrl = `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/realtime-proctoring`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('Proctoring WebSocket connected');
          setWsConnection(ws);
          
          // Authenticate immediately
          ws.send(JSON.stringify({
            type: 'auth',
            data: { userId: participantId },
            timestamp: Date.now()
          }));
          
          resolve();
        };
        
        ws.onmessage = (event) => {
          const response = JSON.parse(event.data);
          console.log('Proctoring WebSocket response:', response);
          
          if (response.type === 'violation_recorded') {
            console.log('Violation recorded:', response.data);
          }
        };
        
        ws.onerror = (error) => {
          console.error('Proctoring WebSocket error:', error);
          reject(error);
        };
        
        ws.onclose = () => {
          console.log('Proctoring WebSocket disconnected');
          setWsConnection(null);
        };
        
      } catch (error) {
        console.error('Error creating proctoring WebSocket:', error);
        reject(error);
      }
    });
  };

  const createOrUpdateProctoringSession = async () => {
    try {
      // Find or create assessment instance
      const { data: instances } = await supabase
        .from('assessment_instances')
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (!instances || instances.length === 0) {
        console.error('No assessment instance found');
        return;
      }

      const instanceId = instances[0].id;

      // Find or create proctoring session
      const { data: existingSessions } = await supabase
        .from('proctoring_sessions')
        .select('id')
        .eq('assessment_instance_id', instanceId)
        .order('created_at', { ascending: false })
        .limit(1);

      let sessionId;
      if (existingSessions && existingSessions.length > 0) {
        sessionId = existingSessions[0].id;
        
        // Update existing session to active
        await supabase
          .from('proctoring_sessions')
          .update({ 
            status: 'active',
            started_at: new Date().toISOString(),
            monitoring_data: {
              camera_active: permissions.camera,
              microphone_active: permissions.microphone,
              last_updated: new Date().toISOString()
            }
          })
          .eq('id', sessionId);
      } else {
        // Create new session
        const { data: newSession } = await supabase
          .from('proctoring_sessions')
          .insert({
            assessment_instance_id: instanceId,
            participant_id: participantId,
            status: 'active',
            started_at: new Date().toISOString(),
            security_events: [],
            monitoring_data: {
              camera_active: permissions.camera,
              microphone_active: permissions.microphone,
              last_updated: new Date().toISOString()
            }
          })
          .select('id')
          .single();
        
        sessionId = newSession?.id;
      }

      setProctoringSessionId(sessionId);
      console.log('Proctoring session initialized:', sessionId);
    } catch (error) {
      console.error('Error creating/updating proctoring session:', error);
    }
  };

  const startPeriodicStatusUpdates = () => {
    const updateInterval = setInterval(async () => {
      if (status === 'active' && proctoringSessionId) {
        try {
          await supabase
            .from('proctoring_sessions')
            .update({
              monitoring_data: {
                camera_active: permissions.camera,
                microphone_active: permissions.microphone,
                face_detected: faceDetected,
                fullscreen: isFullscreen,
                network_status: networkStatus,
                battery_level: batteryLevel,
                last_updated: new Date().toISOString()
              }
            })
            .eq('id', proctoringSessionId);
        } catch (error) {
          console.error('Error updating monitoring data:', error);
        }
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(updateInterval);
  };

  const requestPermissions = async () => {
    if (config.cameraRequired || config.microphoneRequired) {
      try {
        const constraints: MediaStreamConstraints = {};
        if (config.cameraRequired) constraints.video = { width: 640, height: 480 };
        if (config.microphoneRequired) constraints.audio = true;

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current && constraints.video) {
          videoRef.current.srcObject = stream;
          // Ensure video starts playing
          await videoRef.current.play().catch(console.error);
          setPermissions(prev => ({ ...prev, camera: true }));
        }

        if (constraints.audio) {
          setPermissions(prev => ({ ...prev, microphone: true }));
        }

        // Start face detection if enabled
        if (config.faceDetection && constraints.video) {
          startFaceDetection();
        }

      } catch (error) {
        logSecurityEvent({
          type: 'camera_blocked',
          severity: 'critical',
          description: 'Camera or microphone access denied'
        });
        throw error;
      }
    }

    if (config.screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        setPermissions(prev => ({ ...prev, screen: true }));
      } catch (error) {
        logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          description: 'Screen sharing permission denied'
        });
      }
    }
  };

  const setupDeviceMonitoring = async () => {
    // Monitor network status
    window.addEventListener('online', () => setNetworkStatus('online'));
    window.addEventListener('offline', () => setNetworkStatus('offline'));

    // Monitor battery if available
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      } catch (error) {
        console.log('Battery API not available');
      }
    }
  };

  const setupEventListeners = () => {
    // Tab switch detection
    if (config.tabSwitchDetection) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
    }

    // Fullscreen monitoring
    if (config.fullscreenRequired) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    }

    // Keyboard shortcuts blocking
    if (config.browserLockdown) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      logSecurityEvent({
        type: 'tab_switch',
        severity: 'medium',
        description: 'Participant switched away from assessment tab'
      });
    }
  };

  const handleWindowBlur = () => {
    logSecurityEvent({
      type: 'tab_switch',
      severity: 'medium',
      description: 'Assessment window lost focus'
    });
  };

  const handleWindowFocus = () => {
    // Log return to assessment
  };

  const handleFullscreenChange = () => {
    const isNowFullscreen = !!(document.fullscreenElement || 
                              (document as any).webkitFullscreenElement || 
                              (document as any).mozFullScreenElement);
    
    setIsFullscreen(isNowFullscreen);
    
    if (config.fullscreenRequired && !isNowFullscreen) {
      logSecurityEvent({
        type: 'fullscreen_exit',
        severity: 'high',
        description: 'Participant exited fullscreen mode'
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Block common shortcuts
    const blockedKeys = [
      'F12', // Developer tools
      'F5', // Refresh
      'Tab', // Alt+Tab when combined
    ];
    
    if (blockedKeys.includes(e.key) || 
        (e.ctrlKey && ['r', 'R', 'u', 'U', 'i', 'I', 'j', 'J', 's', 'S'].includes(e.key)) ||
        (e.altKey && e.key === 'Tab')) {
      e.preventDefault();
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Blocked keyboard shortcut: ${e.key}`
      });
    }
  };

  const startFaceDetection = () => {
    // Simplified face detection simulation
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context && videoRef.current.videoWidth > 0) {
          // Simulate face detection (in real implementation, use ML library)
          const detected = Math.random() > 0.2; // 80% detection rate simulation
          setFaceDetected(detected);
          
          if (!detected) {
            logSecurityEvent({
              type: 'face_not_detected',
              severity: 'medium',
              description: 'Face not detected in camera feed'
            });
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const logSecurityEvent = async (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
    const securityEvent: SecurityEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...event
    };

    setSecurityEvents(prev => [securityEvent, ...prev].slice(0, 50)); // Keep last 50 events
    onSecurityEvent(securityEvent);

    console.log('Logging security event:', securityEvent);

    try {
      // Use existing WebSocket connection if available
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log('Sending violation via existing WebSocket connection');
        wsConnection.send(JSON.stringify({
          type: 'violation_report',
          data: {
            assessmentId,
            participantId,
            event: securityEvent
          },
          timestamp: Date.now()
        }));
      } else {
        console.log('WebSocket not available, storing violation directly');
        await storeViolationDirectly(securityEvent);
      }
    } catch (error) {
      console.error('Error sending violation:', error);
      
      // Fallback: store directly via Supabase
      await storeViolationDirectly(securityEvent);
    }
  };

  const storeViolationDirectly = async (securityEvent: SecurityEvent) => {
    try {
      // Find assessment instance
      const { data: instances } = await supabase
        .from('assessment_instances')
        .select('id, proctoring_violations, integrity_score')
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (instances && instances.length > 0) {
        const instance = instances[0];
        
        // Safely handle the JSON type from Supabase
        let currentViolations: any[] = [];
        try {
          if (instance.proctoring_violations) {
            currentViolations = Array.isArray(instance.proctoring_violations) 
              ? instance.proctoring_violations as any[]
              : [];
          }
        } catch (error) {
          console.warn('Error parsing proctoring_violations, using empty array:', error);
          currentViolations = [];
        }
        
        // Convert SecurityEvent to plain object for JSON storage
        const violationObject = {
          id: securityEvent.id,
          type: securityEvent.type,
          timestamp: securityEvent.timestamp.toISOString(),
          severity: securityEvent.severity,
          description: securityEvent.description,
          evidence: securityEvent.evidence || null
        };
        
        // Create new array without spreading the potentially problematic type
        const updatedViolations = currentViolations.concat([violationObject]);
        
        // Calculate integrity score
        const severityWeights: Record<string, number> = { low: 1, medium: 3, high: 7, critical: 15 };
        let totalDeduction = 0;
        for (const violation of updatedViolations) {
          const v = violation as any;
          totalDeduction += severityWeights[v.severity] || 3;
        }
        const newIntegrityScore = Math.max(0, 100 - totalDeduction);

        await supabase
          .from('assessment_instances')
          .update({
            proctoring_violations: updatedViolations as any,
            integrity_score: newIntegrityScore
          })
          .eq('id', instance.id);

        console.log('Violation stored directly in database');
      }
    } catch (error) {
      console.error('Error storing violation directly:', error);
    }
  };

  const toggleRecording = () => {
    setRecording(!recording);
    // Implement actual recording logic here
  };

  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const cleanup = () => {
    console.log('Cleaning up proctoring system...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }
    
    // Update proctoring session status
    if (proctoringSessionId) {
      const updateProctoringSession = async () => {
        try {
          await supabase
            .from('proctoring_sessions')
            .update({ 
              status: 'stopped',
              ended_at: new Date().toISOString()
            })
            .eq('id', proctoringSessionId);
          console.log('Proctoring session ended');
        } catch (error) {
          console.error('Error ending proctoring session:', error);
        }
      };
      updateProctoringSession();
    }
    
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'stopped': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-l-blue-500 bg-blue-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'critical': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${getStatusColor()}`} />
                <span className={`font-medium ${getStatusColor()}`}>
                  Proctoring {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  {permissions.camera ? 
                    <Camera className="w-4 h-4 text-green-500" /> : 
                    <Camera className="w-4 h-4 text-red-500" />
                  }
                  <span>Camera</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {permissions.microphone ? 
                    <Mic className="w-4 h-4 text-green-500" /> : 
                    <Mic className="w-4 h-4 text-red-500" />
                  }
                  <span>Microphone</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {networkStatus === 'online' ? 
                    <Wifi className="w-4 h-4 text-green-500" /> : 
                    <WifiOff className="w-4 h-4 text-red-500" />
                  }
                  <span>Network</span>
                </div>
                
                {batteryLevel !== null && (
                  <div className="flex items-center gap-1">
                    <Battery className="w-4 h-4" />
                    <span>{batteryLevel}%</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRecording}
                className={recording ? 'text-red-600' : ''}
              >
                {recording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {recording ? 'Stop' : 'Record'}
              </Button>
              
              {config.fullscreenRequired && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Video Feed
                  {faceDetected ? (
                    <Badge className="bg-green-100 text-green-700">Face Detected</Badge>
                  ) : (
                    <Badge variant="destructive">No Face</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 bg-black rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    width="640"
                    height="480"
                  />
                  {!permissions.camera && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Camera not available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Environment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Environment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fullscreen Mode</span>
                    <div className="flex items-center gap-2">
                      {isFullscreen ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm">{isFullscreen ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Face Detection</span>
                    <div className="flex items-center gap-2">
                      {faceDetected ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm">{faceDetected ? 'Detected' : 'Not Detected'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Network Connection</span>
                    <div className="flex items-center gap-2">
                      {networkStatus === 'online' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm capitalize">{networkStatus}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recording Status</span>
                    <div className="flex items-center gap-2">
                      {recording ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      )}
                      <span className="text-sm">{recording ? 'Recording' : 'Standby'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {securityEvents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {securityEvents.map((event) => (
                    <div key={event.id} className={`p-3 border-l-4 ${getSeverityColor(event.severity)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{event.type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {event.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No security events recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{securityEvents.length}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {securityEvents.filter(e => e.severity === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Events</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {Math.round((faceDetected ? 1 : 0) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Face Detection Rate</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proctoring Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Proctoring settings are configured by the assessment administrator and cannot be modified during the exam.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Camera Required: {config.cameraRequired ? 'Yes' : 'No'}</div>
                  <div>Microphone Required: {config.microphoneRequired ? 'Yes' : 'No'}</div>
                  <div>Screen Sharing: {config.screenSharing ? 'Yes' : 'No'}</div>
                  <div>Tab Switch Detection: {config.tabSwitchDetection ? 'Yes' : 'No'}</div>
                  <div>Fullscreen Required: {config.fullscreenRequired ? 'Yes' : 'No'}</div>
                  <div>Face Detection: {config.faceDetection ? 'Yes' : 'No'}</div>
                  <div>Voice Analysis: {config.voiceAnalysis ? 'Yes' : 'No'}</div>
                  <div>Browser Lockdown: {config.browserLockdown ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveProctoringSystem;