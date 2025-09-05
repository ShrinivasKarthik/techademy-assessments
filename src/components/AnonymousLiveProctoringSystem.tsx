import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Mic, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Maximize,
  Wifi
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'camera_blocked' | 'mic_muted' | 'face_not_detected';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface AnonymousLiveProctoringSystemProps {
  assessmentId: string;
  participantId: string;
  config: any;
  onSecurityEvent: (event: SecurityEvent) => void;
  onStatusChange: (status: 'active' | 'paused' | 'stopped') => void;
  isInAssessment?: boolean; // New prop to indicate if we're in active assessment
}

const AnonymousLiveProctoringSystem: React.FC<AnonymousLiveProctoringSystemProps> = ({
  assessmentId,
  participantId,
  config,
  onSecurityEvent,
  onStatusChange,
  isInAssessment = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<'initializing' | 'active' | 'paused' | 'stopped'>(isInAssessment ? 'active' : 'initializing');
  const [permissions, setPermissions] = useState({
    camera: isInAssessment, // Assume permissions granted if in assessment
    microphone: isInAssessment
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [setupComplete, setSetupComplete] = useState(isInAssessment); // Skip setup if in assessment
  const [violations, setViolations] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    checkFullscreen();
    setupEventListeners();
    
    // If we're in assessment mode, try to get media stream
    if (isInAssessment && config.cameraRequired) {
      requestPermissions();
    }
    
    return () => {
      cleanup();
    };
  }, [isInAssessment]);

  const checkFullscreen = () => {
    const isFullscreenActive = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullscreen(isFullscreenActive);
  };

  const setupEventListeners = () => {
    // Fullscreen change detection
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);

    // Tab visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Keyboard shortcuts detection
    document.addEventListener('keydown', handleKeyDown);
  };

  const handleVisibilityChange = () => {
    if (document.hidden && status === 'active') {
      const event: SecurityEvent = {
        id: Date.now().toString(),
        type: 'tab_switch',
        timestamp: new Date(),
        severity: 'high',
        description: 'Tab switch or window minimized detected'
      };
      setViolations(prev => [event, ...prev].slice(0, 5)); // Keep last 5 violations
      onSecurityEvent(event);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Detect common shortcuts that might indicate cheating
    if (
      (e.ctrlKey && (e.key === 't' || e.key === 'n' || e.key === 'w')) ||
      (e.altKey && e.key === 'Tab') ||
      e.key === 'F11'
    ) {
      e.preventDefault();
      const event: SecurityEvent = {
        id: Date.now().toString(),
        type: 'tab_switch',
        timestamp: new Date(),
        severity: 'medium',
        description: `Blocked shortcut: ${e.ctrlKey ? 'Ctrl+' : e.altKey ? 'Alt+' : ''}${e.key}`
      };
      setViolations(prev => [event, ...prev].slice(0, 5)); // Keep last 5 violations
      onSecurityEvent(event);
    }
  };

  const requestPermissions = async () => {
    try {
      // Request camera permission
      if (config.cameraRequired) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: config.microphoneRequired 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video starts playing
          await videoRef.current.play().catch(console.error);
        }
        
        streamRef.current = stream;
        setPermissions(prev => ({
          ...prev,
          camera: true,
          microphone: config.microphoneRequired
        }));
      }

      // Enter fullscreen if required
      if (config.fullscreenRequired && !isFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      setSetupComplete(true);
      setStatus('active');
      onStatusChange('active');
    } catch (error) {
      console.error('Error requesting permissions:', error);
      // Don't create a security event - this should allow retry
      setStatus('stopped');
      onStatusChange('stopped');
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    document.removeEventListener('fullscreenchange', checkFullscreen);
    document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    document.removeEventListener('mozfullscreenchange', checkFullscreen);
    document.removeEventListener('MSFullscreenChange', checkFullscreen);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('keydown', handleKeyDown);
  };

  if (!setupComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proctoring Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {permissions.camera ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Camera Access</span>
            </div>
            
            {config.microphoneRequired && (
              <div className="flex items-center gap-2">
                {permissions.microphone ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Microphone Access</span>
              </div>
            )}
            
            {config.fullscreenRequired && (
              <div className="flex items-center gap-2">
                {isFullscreen ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Fullscreen Mode</span>
              </div>
            )}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please grant all required permissions to continue with the proctored assessment.
            </AlertDescription>
          </Alert>
          
          <Button onClick={requestPermissions} className="w-full">
            Grant Permissions & Start Proctoring
          </Button>
          
          {status === 'stopped' && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Permission request failed. Please check your browser settings and allow camera/microphone access, then try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={status === 'active' ? 'default' : 'destructive'}>
                {status === 'active' ? 'Proctoring Active' : 'Proctoring Inactive'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {(permissions.camera || isInAssessment) && (
                <Camera className="h-4 w-4 text-green-500" />
              )}
              {(permissions.microphone || isInAssessment) && (
                <Mic className="h-4 w-4 text-green-500" />
              )}
              {isFullscreen && (
                <Maximize className="h-4 w-4 text-green-500" />
              )}
              <Wifi className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Feed */}
      {config.cameraRequired && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Live Camera Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  LIVE
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Violations Display */}
      {violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Security Violations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {violations.map((violation) => (
              <Alert key={violation.id} variant={violation.severity === 'high' || violation.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <div className="flex items-center justify-between">
                    <span>{violation.description}</span>
                    <Badge variant={violation.severity === 'high' || violation.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                      {violation.severity}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {violation.timestamp.toLocaleTimeString()}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnonymousLiveProctoringSystem;