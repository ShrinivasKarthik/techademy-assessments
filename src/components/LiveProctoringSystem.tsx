import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Mic, 
  Monitor, 
  Eye, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Settings,
  Shield,
  Activity,
  Pause,
  Play
} from 'lucide-react';

interface ProctoringSettings {
  cameraRequired: boolean;
  microphoneMonitoring: boolean;
  screenRecording: boolean;
  tabSwitchDetection: boolean;
  facialRecognition: boolean;
  keystrokeAnalysis: boolean;
  timeBasedWarnings: boolean;
}

interface SecurityAlert {
  id: string;
  type: 'tab_switch' | 'camera_lost' | 'face_not_detected' | 'suspicious_behavior' | 'audio_detected';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

const LiveProctoringSystem: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [settings, setSettings] = useState<ProctoringSettings>({
    cameraRequired: true,
    microphoneMonitoring: true,
    screenRecording: true,
    tabSwitchDetection: true,
    facialRecognition: false,
    keystrokeAnalysis: false,
    timeBasedWarnings: true
  });

  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: '1',
      type: 'tab_switch',
      message: 'Candidate switched tabs 3 times in the last 5 minutes',
      timestamp: new Date(),
      severity: 'medium'
    },
    {
      id: '2',
      type: 'camera_lost',
      message: 'Camera feed was lost for 15 seconds',
      timestamp: new Date(Date.now() - 300000),
      severity: 'high'
    }
  ]);

  const [proctoringStats, setProctoringStats] = useState({
    totalTabSwitches: 5,
    cameraUptime: 95,
    faceDetectionRate: 88,
    suspiciousEvents: 2,
    sessionDuration: 45 // minutes
  });

  useEffect(() => {
    if (isActive && settings.cameraRequired) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      stopMicrophone();
    };
  }, [isActive, settings.cameraRequired]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: settings.microphoneMonitoring 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      addAlert('camera_lost', 'Failed to access camera', 'high');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const stopMicrophone = () => {
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      setMicrophoneStream(null);
    }
  };

  const addAlert = (type: SecurityAlert['type'], message: string, severity: SecurityAlert['severity']) => {
    const newAlert: SecurityAlert = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      severity
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep only last 10 alerts
  };

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'tab_switch': return <Monitor className="w-4 h-4" />;
      case 'camera_lost': return <Camera className="w-4 h-4" />;
      case 'face_not_detected': return <Eye className="w-4 h-4" />;
      case 'audio_detected': return <Mic className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'low': return 'text-yellow-500';
      case 'medium': return 'text-orange-500';
      case 'high': return 'text-red-500';
    }
  };

  const toggleSetting = (key: keyof ProctoringSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Proctoring System</h1>
          <p className="text-muted-foreground">Real-time monitoring and security for assessments</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isActive ? "default" : "outline"} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button 
            onClick={() => setIsActive(!isActive)}
            variant={isActive ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isActive ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Live Camera Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                />
                {!cameraStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Camera not available</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant={cameraStream ? "default" : "destructive"}>
                    {cameraStream ? 'Recording' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    No security alerts
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Alert key={alert.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={getAlertColor(alert.severity)}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <AlertDescription className="text-sm">
                            {alert.message}
                          </AlertDescription>
                          <div className="text-xs text-muted-foreground mt-1">
                            {alert.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : 'outline'} className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls & Stats */}
        <div className="space-y-6">
          {/* Proctoring Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Proctoring Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Camera Required</div>
                    <div className="text-xs text-muted-foreground">Mandatory camera monitoring</div>
                  </div>
                  <Switch
                    checked={settings.cameraRequired}
                    onCheckedChange={() => toggleSetting('cameraRequired')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Microphone Monitoring</div>
                    <div className="text-xs text-muted-foreground">Detect audio anomalies</div>
                  </div>
                  <Switch
                    checked={settings.microphoneMonitoring}
                    onCheckedChange={() => toggleSetting('microphoneMonitoring')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Screen Recording</div>
                    <div className="text-xs text-muted-foreground">Record screen activity</div>
                  </div>
                  <Switch
                    checked={settings.screenRecording}
                    onCheckedChange={() => toggleSetting('screenRecording')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Tab Switch Detection</div>
                    <div className="text-xs text-muted-foreground">Monitor browser tabs</div>
                  </div>
                  <Switch
                    checked={settings.tabSwitchDetection}
                    onCheckedChange={() => toggleSetting('tabSwitchDetection')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Facial Recognition</div>
                    <div className="text-xs text-muted-foreground">Verify identity continuously</div>
                  </div>
                  <Switch
                    checked={settings.facialRecognition}
                    onCheckedChange={() => toggleSetting('facialRecognition')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Session Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Camera Uptime</span>
                    <span>{proctoringStats.cameraUptime}%</span>
                  </div>
                  <Progress value={proctoringStats.cameraUptime} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Face Detection Rate</span>
                    <span>{proctoringStats.faceDetectionRate}%</span>
                  </div>
                  <Progress value={proctoringStats.faceDetectionRate} />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{proctoringStats.totalTabSwitches}</div>
                    <div className="text-xs text-muted-foreground">Tab Switches</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{proctoringStats.suspiciousEvents}</div>
                    <div className="text-xs text-muted-foreground">Suspicious Events</div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <div className="text-lg font-semibold">{proctoringStats.sessionDuration}m</div>
                  <div className="text-xs text-muted-foreground">Session Duration</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="w-4 h-4 mr-2" />
                Take Screenshot
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Flag Session
              </Button>
              <Button variant="destructive" className="w-full justify-start">
                <XCircle className="w-4 h-4 mr-2" />
                Terminate Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveProctoringSystem;