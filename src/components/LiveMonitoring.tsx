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
  const { isConnected, subscribe, unsubscribe } = useRealtime();
  const { sendMessage, lastMessage, connect: connectWS, isConnected: wsConnected } = useWebSocket();
  
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

  // Mock data for demonstration
  useEffect(() => {
    const mockParticipants: ParticipantSession[] = [
      {
        id: '1',
        userId: 'user1',
        userName: 'John Doe',
        assessmentId: 'assessment1',
        startedAt: new Date().toISOString(),
        currentQuestion: 3,
        totalQuestions: 10,
        status: 'active',
        violations: [],
        lastActivity: new Date().toISOString(),
        isRecording: true,
        screenShare: true,
        cameraEnabled: true,
        micEnabled: false
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Jane Smith',
        assessmentId: 'assessment1',
        startedAt: new Date(Date.now() - 600000).toISOString(),
        currentQuestion: 7,
        totalQuestions: 10,
        status: 'suspicious',
        violations: ['Multiple tab switches', 'Extended idle time'],
        lastActivity: new Date(Date.now() - 30000).toISOString(),
        isRecording: true,
        screenShare: false,
        cameraEnabled: true,
        micEnabled: true
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'Mike Johnson',
        assessmentId: 'assessment1',
        startedAt: new Date(Date.now() - 1200000).toISOString(),
        currentQuestion: 10,
        totalQuestions: 10,
        status: 'completed',
        violations: [],
        lastActivity: new Date(Date.now() - 300000).toISOString(),
        isRecording: false,
        screenShare: false,
        cameraEnabled: false,
        micEnabled: false
      }
    ];

    setParticipants(mockParticipants);
    
    // Calculate stats
    const newStats: MonitoringStats = {
      totalParticipants: mockParticipants.length,
      activeParticipants: mockParticipants.filter(p => p.status === 'active').length,
      flaggedParticipants: mockParticipants.filter(p => p.status === 'suspicious' || p.status === 'flagged').length,
      completedParticipants: mockParticipants.filter(p => p.status === 'completed').length,
      averageProgress: mockParticipants.reduce((sum, p) => sum + (p.currentQuestion / p.totalQuestions * 100), 0) / mockParticipants.length
    };
    setStats(newStats);
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (isConnected && profile?.role === 'admin') {
      const subscriptionId = subscribe({
        channel: 'assessment_monitoring',
        table: 'assessment_instances',
        callback: (payload) => {
          console.log('Assessment instance update:', payload);
          // Handle real-time updates to participant sessions
        }
      });

      return () => {
        if (subscriptionId) unsubscribe(subscriptionId);
      };
    }
  }, [isConnected, profile, subscribe, unsubscribe]);

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
    setIsMonitoring(true);
    connectWS();
    sendMessage({
      type: 'start_monitoring',
      data: { assessmentId: 'current_assessment' }
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    sendMessage({
      type: 'stop_monitoring',
      data: {}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Monitoring</h2>
          <p className="text-muted-foreground">Real-time assessment monitoring and proctoring</p>
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