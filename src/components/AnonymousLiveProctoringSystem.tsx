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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [status, setStatus] = useState<'initializing' | 'active' | 'paused' | 'stopped'>(isInAssessment ? 'active' : 'initializing');
  const [permissions, setPermissions] = useState({
    camera: isInAssessment, // Assume permissions granted if in assessment
    microphone: isInAssessment
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [setupComplete, setSetupComplete] = useState(isInAssessment); // Skip setup if in assessment
  const [violations, setViolations] = useState<SecurityEvent[]>([]);
  const [faceDetected, setFaceDetected] = useState(true);

  // Debug logging
  useEffect(() => {
    console.log('Proctoring Status:', status, 'IsInAssessment:', isInAssessment);
  }, [status, isInAssessment]);

  useEffect(() => {
    console.log('Fullscreen state:', isFullscreen, 'Config requires fullscreen:', config.fullscreenRequired);
  }, [isFullscreen, config.fullscreenRequired]);

  // Face detection function
  const detectFace = () => {
    if (!videoRef.current || !canvasRef.current || !config.faceDetection) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simplified and more reliable face detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const brightness = calculateBrightness(imageData);
    const centerBrightness = calculateCenterBrightness(imageData);
    
    // Relaxed face detection criteria
    // Check if there's reasonable brightness and some activity in center
    const hasFacePattern = 
      brightness > 30 && brightness < 240 && // Very broad brightness range
      centerBrightness > 20; // Just need some activity in center
    
    if (hasFacePattern !== faceDetected) {
      setFaceDetected(hasFacePattern);
      
      if (!hasFacePattern && status === 'active') {
        const event: SecurityEvent = {
          id: Date.now().toString(),
          type: 'face_not_detected',
          timestamp: new Date(),
          severity: 'high',
          description: 'Face not detected in camera view'
        };
        setViolations(prev => [event, ...prev].slice(0, 5));
        onSecurityEvent(event);
      }
    }
  };

  const calculateBrightness = (imageData: ImageData): number => {
    let total = 0;
    const { data } = imageData;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += (r + g + b) / 3;
    }
    
    return total / (data.length / 4);
  };

  const calculateCenterBrightness = (imageData: ImageData): number => {
    const { data, width, height } = imageData;
    let total = 0;
    let count = 0;
    
    // Calculate brightness in center quarter of image
    const startX = Math.floor(width * 0.375);
    const endX = Math.floor(width * 0.625);
    const startY = Math.floor(height * 0.375);
    const endY = Math.floor(height * 0.625);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        total += (r + g + b) / 3;
        count++;
      }
    }
    
    return count > 0 ? total / count : 0;
  };

  const calculateEdgeContrast = (imageData: ImageData): number => {
    const { data, width, height } = imageData;
    let contrast = 0;
    let count = 0;
    
    // Sample edge detection on a subset of pixels
    for (let y = 1; y < height - 1; y += 4) {
      for (let x = 1; x < width - 1; x += 4) {
        const i = (y * width + x) * 4;
        const current = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Check adjacent pixels
        const right = ((data[i + 4] + data[i + 5] + data[i + 6]) / 3);
        const bottom = ((data[(y + 1) * width * 4 + x * 4] + 
                        data[(y + 1) * width * 4 + x * 4 + 1] + 
                        data[(y + 1) * width * 4 + x * 4 + 2]) / 3);
        
        contrast += Math.abs(current - right) + Math.abs(current - bottom);
        count += 2;
      }
    }
    
    return count > 0 ? contrast / count : 0;
  };

  useEffect(() => {
    console.log('Setting up proctoring, isInAssessment:', isInAssessment);
    checkFullscreen();
    setupEventListeners();
    
    // If we're in assessment mode, try to get media stream
    if (isInAssessment && config.cameraRequired) {
      requestPermissions();
    }
    
    // Ensure status is properly set for assessment mode
    if (isInAssessment && status !== 'active') {
      console.log('Forcing status to active for assessment mode');
      setStatus('active');
      onStatusChange('active');
    }
    
    return () => {
      cleanup();
    };
  }, [isInAssessment, config.cameraRequired]);

  const checkFullscreen = () => {
    const isFullscreenActive = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    console.log('Fullscreen check:', { 
      isFullscreenActive, 
      currentStatus: status, 
      fullscreenRequired: config.fullscreenRequired,
      wasFullscreen: isFullscreen 
    });
    
    setIsFullscreen(isFullscreenActive);
    
    // If fullscreen is exited while proctoring is active, create a violation
    if (!isFullscreenActive && status === 'active' && config.fullscreenRequired && isFullscreen) {
      console.log('Creating fullscreen violation');
      const event: SecurityEvent = {
        id: Date.now().toString(),
        type: 'fullscreen_exit',
        timestamp: new Date(),
        severity: 'high',
        description: 'Fullscreen mode exited'
      };
      setViolations(prev => [event, ...prev].slice(0, 5));
      onSecurityEvent(event);
    }
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
    console.log('Visibility change:', { hidden: document.hidden, status });
    if (document.hidden && status === 'active') {
      console.log('Creating tab switch violation');
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
          
          // Start face detection if required
          if (config.faceDetection) {
            faceDetectionIntervalRef.current = setInterval(detectFace, 2000); // Check every 2 seconds
          }
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
    
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
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
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              <div className="absolute bottom-2 left-2 flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  LIVE
                </Badge>
                {config.faceDetection && (
                  <Badge variant={faceDetected ? "default" : "destructive"} className="text-xs">
                    {faceDetected ? "FACE OK" : "NO FACE"}
                  </Badge>
                )}
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