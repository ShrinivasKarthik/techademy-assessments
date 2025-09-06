import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Clock, 
  Activity,
  Keyboard,
  Copy,
  MousePointer,
  Brain,
  TrendingUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuspiciousActivity {
  id: string;
  userId: string;
  userName: string;
  assessmentId: string;
  assessmentTitle: string;
  activityType: 'keystroke_anomaly' | 'tab_switch' | 'copy_paste' | 'timing_anomaly' | 'behavioral_pattern';
  suspicionScore: number;
  timestamp: string;
  details: string;
  evidence: any;
  status: 'pending' | 'reviewed' | 'confirmed' | 'dismissed';
}

interface BehavioralPattern {
  userId: string;
  userName: string;
  keystrokePattern: number[];
  typingSpeed: number;
  pausePattern: number[];
  mouseMovements: number;
  scrollBehavior: number;
  consistencyScore: number;
  anomalyFlags: string[];
}

interface FraudMetrics {
  totalFlags: number;
  highRiskActivities: number;
  falsePositiveRate: number;
  detectionAccuracy: number;
  averageResponseTime: number;
}

const FraudDetectionSystem: React.FC = () => {
  const [activities, setActivities] = useState<SuspiciousActivity[]>([]);
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([]);
  const [metrics, setMetrics] = useState<FraudMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadFraudData();
  }, [timeRange]);

  const loadFraudData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fraud-detection-enhanced', {
        body: { 
          timeRange,
          includePatterns: true,
          analysisDepth: 'comprehensive'
        }
      });

      if (error) throw error;

      setActivities(data.activities || []);
      setPatterns(data.patterns || []);
      setMetrics(data.metrics || null);
    } catch (error) {
      console.error('Error loading fraud data:', error);
      toast.error('Failed to load fraud detection data');
      
      // Mock data for demo
      const mockActivities: SuspiciousActivity[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'John Doe',
          assessmentId: 'assess1',
          assessmentTitle: 'JavaScript Fundamentals',
          activityType: 'keystroke_anomaly',
          suspicionScore: 85,
          timestamp: new Date().toISOString(),
          details: 'Typing pattern significantly different from baseline',
          evidence: { avgKeystroke: 150, baseline: 200, deviation: 25 },
          status: 'pending'
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'Jane Smith',
          assessmentId: 'assess2',
          assessmentTitle: 'React Development',
          activityType: 'copy_paste',
          suspicionScore: 92,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: 'Multiple large text blocks pasted in coding questions',
          evidence: { pasteCount: 8, avgLength: 250 },
          status: 'pending'
        }
      ];

      const mockPatterns: BehavioralPattern[] = [
        {
          userId: 'user1',
          userName: 'John Doe',
          keystrokePattern: [180, 190, 175, 200, 160],
          typingSpeed: 45,
          pausePattern: [2.5, 3.1, 2.8, 4.2, 1.9],
          mouseMovements: 150,
          scrollBehavior: 85,
          consistencyScore: 72,
          anomalyFlags: ['irregular_typing_speed', 'unusual_pause_pattern']
        }
      ];

      const mockMetrics: FraudMetrics = {
        totalFlags: 15,
        highRiskActivities: 3,
        falsePositiveRate: 8.5,
        detectionAccuracy: 91.2,
        averageResponseTime: 2.3
      };

      setActivities(mockActivities);
      setPatterns(mockPatterns);
      setMetrics(mockMetrics);
    } finally {
      setLoading(false);
    }
  };

  const updateActivityStatus = async (activityId: string, status: 'confirmed' | 'dismissed') => {
    try {
      // Update local state since we're using mock data
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId ? { ...activity, status } : activity
        )
      );

      toast.success(`Activity ${status}`);
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity status');
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getSeverityLabel = (score: number) => {
    if (score >= 80) return 'HIGH RISK';
    if (score >= 60) return 'MEDIUM RISK';
    return 'LOW RISK';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'keystroke_anomaly': return <Keyboard className="h-4 w-4" />;
      case 'tab_switch': return <Activity className="h-4 w-4" />;
      case 'copy_paste': return <Copy className="h-4 w-4" />;
      case 'timing_anomaly': return <Clock className="h-4 w-4" />;
      case 'behavioral_pattern': return <Brain className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'keystroke_anomaly': return 'Keystroke Pattern Anomaly';
      case 'tab_switch': return 'Tab Switching Detected';
      case 'copy_paste': return 'Copy-Paste Activity';
      case 'timing_anomaly': return 'Timing Inconsistency';
      case 'behavioral_pattern': return 'Behavioral Pattern Change';
      default: return 'Suspicious Activity';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fraud Detection System</h1>
          <p className="text-muted-foreground">
            Advanced behavioral analysis and cheating detection
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={loadFraudData} disabled={loading}>
            <Shield className="h-4 w-4 mr-2" />
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Flags</p>
                  <p className="text-2xl font-bold">{metrics.totalFlags}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">High Risk</p>
                  <p className="text-2xl font-bold">{metrics.highRiskActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold">{metrics.detectionAccuracy}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">False Positive</p>
                  <p className="text-2xl font-bold">{metrics.falsePositiveRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold">{metrics.averageResponseTime}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">Suspicious Activities</TabsTrigger>
          <TabsTrigger value="patterns">Behavioral Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="grid gap-4">
            {activities.map((activity) => (
              <Card key={activity.id} className={activity.suspicionScore >= 80 ? 'border-red-200' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {getActivityIcon(activity.activityType)}
                        <h3 className="font-semibold">{getActivityTitle(activity.activityType)}</h3>
                        <Badge 
                          variant="secondary" 
                          className={getSeverityColor(activity.suspicionScore)}
                        >
                          {getSeverityLabel(activity.suspicionScore)}
                        </Badge>
                        <Badge variant="outline" className={
                          activity.status === 'pending' ? 'text-orange-600 bg-orange-100' :
                          activity.status === 'confirmed' ? 'text-red-600 bg-red-100' :
                          'text-green-600 bg-green-100'
                        }>
                          {activity.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <p><strong>User:</strong> {activity.userName}</p>
                        <p><strong>Assessment:</strong> {activity.assessmentTitle}</p>
                        <p><strong>Time:</strong> {new Date(activity.timestamp).toLocaleString()}</p>
                        <p><strong>Details:</strong> {activity.details}</p>
                        
                        {activity.evidence && (
                          <div className="bg-secondary/20 p-3 rounded-lg">
                            <p className="font-medium mb-1">Evidence:</p>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(activity.evidence, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Suspicion Score:</span>
                        <Progress value={activity.suspicionScore} className="w-32" />
                        <span className="text-sm font-medium">{activity.suspicionScore}%</span>
                      </div>
                    </div>

                    {activity.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => updateActivityStatus(activity.id, 'confirmed')}
                        >
                          Confirm Fraud
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateActivityStatus(activity.id, 'dismissed')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {activities.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-green-700">No Suspicious Activities</h3>
                  <p className="text-sm text-muted-foreground">
                    All assessment activities appear normal
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-4">
            {patterns.map((pattern) => (
              <Card key={pattern.userId}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{pattern.userName}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Consistency Score:</span>
                        <Progress value={pattern.consistencyScore} className="w-24" />
                        <span className="text-sm font-medium">{pattern.consistencyScore}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Typing Speed</p>
                        <p className="font-medium">{pattern.typingSpeed} WPM</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mouse Movements</p>
                        <p className="font-medium">{pattern.mouseMovements}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Scroll Behavior</p>
                        <p className="font-medium">{pattern.scrollBehavior}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Keystroke Avg</p>
                        <p className="font-medium">{Math.round(pattern.keystrokePattern.reduce((a, b) => a + b, 0) / pattern.keystrokePattern.length)}ms</p>
                      </div>
                    </div>

                    {pattern.anomalyFlags.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-orange-700">Anomaly Flags:</p>
                        <div className="flex flex-wrap gap-2">
                          {pattern.anomalyFlags.map((flag, index) => (
                            <Badge key={index} variant="secondary" className="text-orange-600 bg-orange-100">
                              {flag.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Keystroke Pattern (ms)</h4>
                        <div className="h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={pattern.keystrokePattern.map((value, index) => ({ index, value }))}>
                              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
                              <XAxis dataKey="index" />
                              <YAxis />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Pause Pattern (s)</h4>
                        <div className="h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pattern.pausePattern.map((value, index) => ({ index, value }))}>
                              <Bar dataKey="value" fill="#16a34a" />
                              <XAxis dataKey="index" />
                              <YAxis />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detection Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { date: '1', detections: 5, falsePositives: 1 },
                      { date: '2', detections: 8, falsePositives: 2 },
                      { date: '3', detections: 12, falsePositives: 1 },
                      { date: '4', detections: 6, falsePositives: 0 },
                      { date: '5', detections: 15, falsePositives: 3 },
                      { date: '6', detections: 9, falsePositives: 1 },
                      { date: '7', detections: 11, falsePositives: 2 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="detections" stroke="#2563eb" name="Detections" />
                      <Line type="monotone" dataKey="falsePositives" stroke="#dc2626" name="False Positives" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Types</CardTitle>
              </CardHeader>
              <CardContent>  
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { type: 'Keystroke', count: 15 },
                      { type: 'Copy/Paste', count: 8 },
                      { type: 'Tab Switch', count: 22 },
                      { type: 'Timing', count: 5 },
                      { type: 'Behavioral', count: 12 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FraudDetectionSystem;