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
}

const AnonymousLiveProctoringSystem: React.FC<AnonymousLiveProctoringSystemProps> = ({
  assessmentId,
  participantId,
  config,
  onSecurityEvent,
  onStatusChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<'initializing' | 'active' | 'paused' | 'stopped'>('initializing');
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    checkFullscreen();
    setupEventListeners();
    
    return () => {
      cleanup();
    };
  }, []);

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
      const event: SecurityEvent = {
        id: Date.now().toString(),
        type: 'camera_blocked',
        timestamp: new Date(),
        severity: 'critical',
        description: 'Failed to access camera or microphone'
      };
      onSecurityEvent(event);
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
              {permissions.camera && (
                <Camera className="h-4 w-4 text-green-500" />
              )}
              {permissions.microphone && (
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
    </div>
  );
};

export default AnonymousLiveProctoringSystem;