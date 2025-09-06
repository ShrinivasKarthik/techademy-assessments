import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  Monitor, 
  Users, 
  Eye, 
  Settings,
  Play,
  Square
} from 'lucide-react';
import AssessmentMonitoringStatus from './AssessmentMonitoringStatus';
import EnhancedRealTimeMonitoring from './enhanced/EnhancedRealTimeMonitoring';

const LiveMonitoring: React.FC = () => {
  const { toast } = useToast();
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('status');

  const handleSelectAssessment = (assessmentId: string) => {
    console.log('Selected assessment for monitoring:', assessmentId);
    setSelectedAssessment(assessmentId);
    setActiveTab('monitoring');
    
    toast({
      title: "Assessment Selected",
      description: "Starting live monitoring for selected assessment",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time assessment monitoring and proctoring oversight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Monitoring System
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Assessment Status
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Monitoring
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssessmentMonitoringStatus 
                onSelectAssessment={handleSelectAssessment}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <EnhancedRealTimeMonitoring />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprehensive analytics and reporting features coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure monitoring parameters and alert thresholds.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveMonitoring;