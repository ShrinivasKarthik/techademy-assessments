import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Users, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MonitoringStatusProps {
  onSelectAssessment?: (assessmentId: string) => void;
}

const AssessmentMonitoringStatus: React.FC<MonitoringStatusProps> = ({ onSelectAssessment }) => {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonitoringAssessments();
  }, []);

  const loadMonitoringAssessments = async () => {
    try {
      // Get assessments with live monitoring enabled
      const { data: assessmentData, error } = await supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          live_monitoring_enabled,
          status,
          created_at
        `)
        .eq('live_monitoring_enabled', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get active participants count for each assessment
      const assessmentsWithCounts = await Promise.all((assessmentData || []).map(async (assessment) => {
        // Count instances that are currently active (in_progress) or recently active (within last hour)
        const { count } = await supabase
          .from('assessment_instances')
          .select('*', { count: 'exact', head: true })
          .eq('assessment_id', assessment.id)
          .in('status', ['in_progress'])
          .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

        return {
          ...assessment,
          activeParticipants: count || 0
        };
      }));

      setAssessments(assessmentsWithCounts);
    } catch (error) {
      console.error('Error loading monitoring assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load monitoring assessments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading assessments...</p>
        </CardContent>
      </Card>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Assessment Monitoring Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No assessments available for monitoring</p>
            <p className="text-sm text-muted-foreground">
              Enable live monitoring when creating assessments to see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Assessment Monitoring Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <h4 className="font-medium">{assessment.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {assessment.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="w-3 h-3" />
                    <span>{assessment.activeParticipants} active</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="w-3 h-3" />
                    <span>Created {new Date(assessment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={assessment.activeParticipants > 0 ? "default" : "secondary"}
                >
                  {assessment.activeParticipants > 0 ? 'Active' : 'Inactive'}
                </Badge>
                {assessment.activeParticipants > 0 && onSelectAssessment && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectAssessment(assessment.id)}
                  >
                    Monitor
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentMonitoringStatus;