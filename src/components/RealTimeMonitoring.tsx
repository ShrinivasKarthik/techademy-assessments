import React, { useState, useEffect } from 'react';
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

interface ParticipantSession {
  id: string;
  participantName: string;
  assessmentTitle: string;
  status: 'active' | 'paused' | 'completed' | 'flagged';
  timeRemaining: number;
  totalTime: number;
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  connectionStatus: 'stable' | 'unstable' | 'disconnected';
  proctoring: {
    cameraActive: boolean;
    microphoneActive: boolean;
    screenRecording: boolean;
    tabSwitches: number;
    suspiciousActivity: number;
  };
  startedAt: string;
}

const RealTimeMonitoring: React.FC = () => {
  const [sessions, setSessions] = useState<ParticipantSession[]>([
    {
      id: '1',
      participantName: 'John Doe',
      assessmentTitle: 'React Developer Assessment',
      status: 'active',
      timeRemaining: 2400,
      totalTime: 3600,
      currentQuestion: 3,
      totalQuestions: 10,
      score: 85,
      connectionStatus: 'stable',
      proctoring: {
        cameraActive: true,
        microphoneActive: false,
        screenRecording: true,
        tabSwitches: 2,
        suspiciousActivity: 1
      },
      startedAt: new Date(Date.now() - 1200000).toISOString()
    },
    {
      id: '2',
      participantName: 'Jane Smith',
      assessmentTitle: 'Python Backend Assessment',
      status: 'flagged',
      timeRemaining: 1800,
      totalTime: 3600,
      currentQuestion: 5,
      totalQuestions: 8,
      score: 72,
      connectionStatus: 'unstable',
      proctoring: {
        cameraActive: false,
        microphoneActive: false,
        screenRecording: true,
        tabSwitches: 8,
        suspiciousActivity: 4
      },
      startedAt: new Date(Date.now() - 1800000).toISOString()
    }
  ]);

  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const getStatusColor = (status: ParticipantSession['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'default';
      case 'flagged': return 'destructive';
      default: return 'outline';
    }
  };

  const getConnectionIcon = (status: ParticipantSession['connectionStatus']) => {
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

  const getTimeProgress = (remaining: number, total: number) => {
    return ((total - remaining) / total) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Monitoring</h1>
          <p className="text-muted-foreground">Monitor ongoing assessments and participant activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </Badge>
          <Button variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">12</div>
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
                <div className="text-2xl font-bold">8</div>
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
                <div className="text-2xl font-bold">3</div>
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
                <div className="text-2xl font-bold">45m</div>
                <div className="text-sm text-muted-foreground">Avg. Time</div>
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
                  {sessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedSession === session.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{session.participantName}</div>
                                <div className="text-sm text-muted-foreground">{session.assessmentTitle}</div>
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
                            <div className="flex items-center gap-2">
                              {session.proctoring.cameraActive ? (
                                <Camera className="w-4 h-4 text-green-500" />
                              ) : (
                                <Camera className="w-4 h-4 text-red-500" />
                              )}
                              {session.proctoring.screenRecording && (
                                <Monitor className="w-4 h-4 text-blue-500" />
                              )}
                              {session.proctoring.suspiciousActivity > 0 && (
                                <Flag className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Session Details */}
            <div className="space-y-4">
              {selectedSession && (
                <>
                  <h3 className="text-lg font-semibold">Session Details</h3>
                  {(() => {
                    const session = sessions.find(s => s.id === selectedSession);
                    if (!session) return null;

                    return (
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
                              <p><span className="font-medium">Name:</span> {session.participantName}</p>
                              <p><span className="font-medium">Assessment:</span> {session.assessmentTitle}</p>
                              <p><span className="font-medium">Started:</span> {new Date(session.startedAt).toLocaleTimeString()}</p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Time Progress</h4>
                            <Progress value={getTimeProgress(session.timeRemaining, session.totalTime)} />
                            <div className="flex justify-between text-sm mt-1">
                              <span>{formatTime(session.totalTime - session.timeRemaining)} elapsed</span>
                              <span>{formatTime(session.timeRemaining)} remaining</span>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Proctoring Status</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Camera</span>
                                <Badge variant={session.proctoring.cameraActive ? 'default' : 'destructive'}>
                                  {session.proctoring.cameraActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Screen Recording</span>
                                <Badge variant={session.proctoring.screenRecording ? 'default' : 'destructive'}>
                                  {session.proctoring.screenRecording ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Tab Switches</span>
                                <Badge variant={session.proctoring.tabSwitches > 5 ? 'destructive' : 'outline'}>
                                  {session.proctoring.tabSwitches}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Suspicious Activity</span>
                                <Badge variant={session.proctoring.suspiciousActivity > 0 ? 'destructive' : 'default'}>
                                  {session.proctoring.suspiciousActivity}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" />
                              View Screen
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

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <div className="font-medium">Suspicious Activity Detected</div>
                    <div className="text-sm text-muted-foreground">Jane Smith - Multiple tab switches (8 times)</div>
                  </div>
                  <Badge variant="destructive">High</Badge>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1">
                    <div className="font-medium">Connection Issues</div>
                    <div className="text-sm text-muted-foreground">Mike Johnson - Unstable connection detected</div>
                  </div>
                  <Badge variant="secondary">Medium</Badge>
                </div>
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
                  Live performance chart would be rendered here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Question Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Question difficulty analytics would be rendered here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeMonitoring;