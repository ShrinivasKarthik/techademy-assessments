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
import * as faceapi from '@vladmandic/face-api';

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
  onStatusChange: (status: 'active' | 'paused' | 'stopped' | 'ended') => void;
  isInAssessment?: boolean; // New prop to indicate if we're in active assessment
}

interface AnonymousLiveProctoringSystemRef {
  cleanup: () => void;
  endProctoring: () => void;
  getViolations: () => SecurityEvent[];
  getProctoringData: () => {
    violations: SecurityEvent[];
    summary: {
      integrity_score: number;
      violations_count: number;
      technical_issues: string[];
    };
  };
}

const AnonymousLiveProctoringSystem = React.forwardRef<AnonymousLiveProctoringSystemRef, AnonymousLiveProctoringSystemProps>(({
  assessmentId,
  participantId,
  config,
  onSecurityEvent,
  onStatusChange,
  isInAssessment = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modelsLoadedRef = useRef<boolean>(false);
  
  const [status, setStatus] = useState<'initializing' | 'active' | 'paused' | 'stopped' | 'ended'>(isInAssessment ? 'active' : 'initializing');
  const [permissions, setPermissions] = useState({
    camera: isInAssessment,
    microphone: isInAssessment
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [setupComplete, setSetupComplete] = useState(isInAssessment);
  const [violations, setViolations] = useState<SecurityEvent[]>([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const faceDetectedRef = useRef(false); // Add ref to track actual state
  const [detectionTimestamp, setDetectionTimestamp] = useState(Date.now());
  const [renderKey, setRenderKey] = useState(0);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Debug effect to track faceDetected state changes
  useEffect(() => {
    console.log('🎯 RENDER: faceDetected state changed to:', faceDetected);
    console.log('🎯 RENDER: faceDetectedRef current value:', faceDetectedRef.current);
  }, [faceDetected]);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face detection models...');
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        modelsLoadedRef.current = true;
        setModelsLoading(false);
        console.log('Face detection models loaded successfully');
      } catch (error) {
        console.error('Error loading face detection models:', error);
        setModelsLoading(false);
      }
    };
    
    loadModels();
  }, []);

  // REAL face detection using face-api.js
  const detectFace = async () => {
    console.log('=== FACE DETECTION ATTEMPT ===');
    console.log('Video ref exists:', !!videoRef.current);
    console.log('Models loaded:', modelsLoadedRef.current);
    console.log('Config face detection:', config.faceDetection);
    console.log('Current face detected state:', faceDetected);
    
    if (!videoRef.current) {
      console.log('❌ No video element');
      return;
    }
    
    if (!modelsLoadedRef.current) {
      console.log('❌ Models not loaded yet');
      return;
    }
    
    if (!config.faceDetection) {
      console.log('❌ Face detection disabled in config');
      return;
    }

    const video = videoRef.current;
    
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('Video ready state:', video.readyState);
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('❌ Video not ready - no dimensions');
      return;
    }

    try {
      console.log('🔍 Starting face detection...');
      
      // Use face-api.js for REAL face detection
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 224, 
          scoreThreshold: 0.3  // Lower threshold to see if anything is detected
        }));

      console.log('🎯 Detection results:', {
        detectionsFound: detections?.length || 0,
        detectionScores: detections?.map(d => d.score?.toFixed(3)) || [],
        detectionBoxes: detections?.map(d => ({
          x: Math.round(d.box?.x || 0),
          y: Math.round(d.box?.y || 0), 
          width: Math.round(d.box?.width || 0),
          height: Math.round(d.box?.height || 0)
        })) || []
      });

      const hasFace = detections && detections.length > 0;
      
      console.log('✅ Face detection completed:', {
        previousState: faceDetected,
        previousRef: faceDetectedRef.current,
        newState: hasFace,
        stateChanged: hasFace !== faceDetectedRef.current
      });
      
      if (hasFace !== faceDetectedRef.current) {
        console.log('🔄 UPDATING face detection state from', faceDetectedRef.current, 'to', hasFace);
        
        // Update both ref and state
        faceDetectedRef.current = hasFace;
        setFaceDetected(hasFace);
        setDetectionTimestamp(Date.now());
        setRenderKey(prev => prev + 1); // Force re-render
        
        if (!hasFace && status === 'active') {
          console.log('⚠️ Creating face not detected violation');
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
      } else {
        console.log('➡️ No state change needed - current:', faceDetectedRef.current, 'detected:', hasFace);
        // Still update timestamp to show detection is working
        setDetectionTimestamp(Date.now());
        setRenderKey(prev => prev + 1); // Force re-render even without state change
      }
    } catch (error) {
      console.error('💥 Face detection error:', error);
    }
    
    console.log('=== FACE DETECTION COMPLETE ===\n');
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

  const calculateImageVariance = (imageData: ImageData): number => {
    const { data } = imageData;
    let sum = 0;
    let sumSquares = 0;
    let count = 0;
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) { // Every 4th pixel
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = (r + g + b) / 3;
      
      sum += gray;
      sumSquares += gray * gray;
      count++;
    }
    
    const mean = sum / count;
    const variance = (sumSquares / count) - (mean * mean);
    
    return variance;
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
    console.log('Proctoring component mounted/updated:', {
      isInAssessment,
      status,
      setupComplete,
      permissions
    });
    
    checkFullscreen();
    setupEventListeners();
    
    // Initialize proctoring based on mode
    if (isInAssessment) {
      console.log('In assessment mode - setting up proctoring');
      setSetupComplete(true);
      setStatus('active');
      onStatusChange('active');
      
      // Always request camera permissions for assessment mode
      if (config.cameraRequired) {
        console.log('🚀 Auto-requesting camera permissions for assessment mode...');
        requestPermissions();
      }
    } else {
      console.log('In setup mode - waiting for user action');
    }
    
    return () => {
      cleanup();
    };
  }, [isInAssessment]);

  // Remove the conflicting effect that was causing infinite loops
  // The status is already properly managed in the main useEffect

  const checkFullscreen = () => {
    const isFullscreenActive = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    setIsFullscreen(isFullscreenActive);
    
    // If fullscreen is exited while proctoring is active, create a violation
    if (!isFullscreenActive && status === 'active' && config.fullscreenRequired) {
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
    if (document.hidden && status === 'active') {
      const event: SecurityEvent = {
        id: Date.now().toString(),
        type: 'tab_switch',
        timestamp: new Date(),
        severity: 'high',
        description: 'Tab switch or window minimized detected'
      };
      setViolations(prev => [event, ...prev].slice(0, 5));
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
      console.log('📹 Requesting permissions...');
      console.log('Config:', config);
      
      // Request camera permission
      if (config.cameraRequired) {
        console.log('📹 Requesting camera access...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: config.microphoneRequired || false
        });
        
        console.log('✅ Got media stream:', stream);
        console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        
        if (videoRef.current) {
          console.log('📹 Setting video srcObject');
          videoRef.current.srcObject = stream;
          
          // Force play
          videoRef.current.play().then(() => {
            console.log('✅ Video is playing');
          }).catch(err => {
            console.error('❌ Video play failed:', err);
          });
        } else {
          console.error('❌ videoRef.current is null');
        }
        
        streamRef.current = stream;
        setPermissions(prev => ({
          ...prev,
          camera: true,
          microphone: config.microphoneRequired || false
        }));
        
        // Start face detection if required
        if (config.faceDetection && modelsLoadedRef.current) {
          console.log('🚀 Starting face detection...');
          detectFace();
          faceDetectionIntervalRef.current = setInterval(detectFace, 2000);
        }
      }

      // Enter fullscreen if required
      if (config.fullscreenRequired && !isFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      setSetupComplete(true);
      setStatus('active');
      onStatusChange('active');
      console.log('✅ Permissions setup complete');
      
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      setStatus('stopped');
      onStatusChange('stopped');
    }
  };

  const endProctoring = () => {
    console.log('🏁 Ending proctoring gracefully...');
    
    // Stop face detection
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
      console.log('🔍 Stopped face detection interval');
    }
    
    // Stop and clear video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('📹 Stopped media track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      console.log('📹 Cleared video element');
    }
    
    // Update status to ended
    setStatus('ended');
    onStatusChange('ended');
    
    console.log('✅ Proctoring ended successfully');
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up proctoring system...');
    
    // Stop and clear video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('📹 Stopped media track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      console.log('📹 Cleared video element');
    }
    
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
      console.log('🔍 Stopped face detection interval');
    }
    
    // Clear all event listeners
    document.removeEventListener('fullscreenchange', checkFullscreen);
    document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    document.removeEventListener('mozfullscreenchange', checkFullscreen);
    document.removeEventListener('MSFullscreenChange', checkFullscreen);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('keydown', handleKeyDown);
    
    // Update status
    setStatus('stopped');
    onStatusChange('stopped');
    
    console.log('✅ Proctoring cleanup complete');
  };

  const getViolations = () => violations;

  const getProctoringData = () => {
    const totalViolations = violations.length;
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;
    
    // Calculate integrity score based on violations
    let integrityScore = 100;
    integrityScore -= criticalViolations * 30; // Critical violations reduce score by 30 points
    integrityScore -= highViolations * 15; // High violations reduce score by 15 points
    integrityScore -= (totalViolations - criticalViolations - highViolations) * 5; // Other violations reduce by 5 points
    integrityScore = Math.max(0, integrityScore); // Ensure score doesn't go below 0
    
    const technicalIssues: string[] = [];
    if (!permissions.camera && config.cameraRequired) {
      technicalIssues.push('Camera access denied');
    }
    if (!permissions.microphone && config.microphoneRequired) {
      technicalIssues.push('Microphone access denied');
    }
    if (violations.some(v => v.type === 'camera_blocked')) {
      technicalIssues.push('Camera blocked during assessment');
    }
    
    return {
      violations,
      summary: {
        integrity_score: integrityScore,
        violations_count: totalViolations,
        technical_issues: technicalIssues
      }
    };
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    cleanup,
    endProctoring,
    getViolations,
    getProctoringData
  }), [violations, permissions, config]);

  // Auto-proceed to assessment if minimal requirements are met
  useEffect(() => {
    if (!setupComplete && !config.cameraRequired && !config.microphoneRequired && !config.fullscreenRequired) {
      console.log('🚀 Auto-proceeding with minimal proctoring requirements');
      setSetupComplete(true);
      setStatus('active');
      onStatusChange('active');
    }
  }, [setupComplete, config]);

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
              <span className="text-sm">Camera Access {!config.cameraRequired && <span className="text-muted-foreground">(Optional)</span>}</span>
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
              {config.cameraRequired || config.microphoneRequired || config.fullscreenRequired 
                ? "Please grant all required permissions to continue with the proctored assessment."
                : "Basic proctoring is enabled. You may proceed or grant additional permissions for enhanced monitoring."
              }
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button onClick={requestPermissions} className="w-full">
              {config.cameraRequired || config.microphoneRequired 
                ? "Grant Permissions & Start Proctoring"
                : "Grant Enhanced Permissions"
              }
            </Button>
            
            {!config.cameraRequired && !config.microphoneRequired && !config.fullscreenRequired && (
              <Button 
                onClick={() => {
                  setSetupComplete(true);
                  setStatus('active');
                  onStatusChange('active');
                }} 
                variant="outline" 
                className="w-full"
              >
                Continue with Basic Proctoring
              </Button>
            )}
          </div>
          
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

  // Show "Proctoring Ended" UI when status is ended
  if (status === 'ended') {
    const proctoringData = getProctoringData();
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Badge variant="secondary" className="mb-3">
              Proctoring Ended
            </Badge>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Assessment monitoring has been completed.</p>
              <div className="flex justify-center gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{proctoringData.summary.integrity_score}</div>
                  <div className="text-xs">Integrity Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">{proctoringData.summary.violations_count}</div>
                  <div className="text-xs">Violations</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
              <span className="text-xs text-muted-foreground">
                Status: {status} | InAssessment: {isInAssessment ? 'Yes' : 'No'}
              </span>
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
                onLoadedMetadata={() => {
                  console.log('✅ Video metadata loaded');
                  console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                }}
                onCanPlay={() => {
                  console.log('✅ Video can play');
                }}
                onPlay={() => {
                  console.log('✅ Video started playing');
                }}
                onError={(e) => {
                  console.error('❌ Video error:', e);
                }}
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
                  <Badge 
                    key={renderKey} 
                    variant={faceDetectedRef.current ? "default" : "destructive"} 
                    className="text-xs"
                  >
                    {modelsLoading ? "LOADING..." : (faceDetectedRef.current ? "FACE DETECTED" : "NO FACE")} 
                    <span className="ml-1 text-xs opacity-70">
                      {modelsLoading ? "" : Math.floor((Date.now() - detectionTimestamp) / 1000)}s
                    </span>
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
});

export default AnonymousLiveProctoringSystem;
export type { AnonymousLiveProctoringSystemRef };