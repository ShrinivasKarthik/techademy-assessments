import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { useAssessmentLifecycle } from '@/hooks/useAssessmentLifecycle';
import { 
  Edit, 
  Play, 
  Eye, 
  Archive, 
  Copy, 
  Users, 
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  duration_minutes: number;
  proctoring_enabled?: boolean;
}

interface AssessmentWorkflowProps {
  assessment: Assessment;
  onStatusChange?: () => void;
}

const AssessmentWorkflow: React.FC<AssessmentWorkflowProps> = ({ 
  assessment, 
  onStatusChange 
}) => {
  const navigate = useNavigate();
  const { 
    publishAssessment, 
    archiveAssessment, 
    duplicateAssessment, 
    loading 
  } = useAssessmentLifecycle();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'archived': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return CheckCircle;
      case 'archived': return Archive;
      default: return Clock;
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    // Always available actions
    actions.push({
      label: 'Preview',
      icon: Eye,
      variant: 'outline' as const,
      action: () => navigate(`/assessments/${assessment.id}/preview`)
    });

    actions.push({
      label: 'Duplicate',
      icon: Copy,
      variant: 'outline' as const,
      action: async () => {
        const newId = await duplicateAssessment(assessment.id);
        if (newId) {
          navigate(`/assessments/create?duplicate=${newId}`);
        }
      }
    });

    // Status-specific actions
    switch (assessment.status) {
      case 'draft':
        actions.unshift({
          label: 'Edit',
          icon: Edit,
          variant: 'default' as const,
          action: () => navigate(`/assessments/create?edit=${assessment.id}`)
        });
        
        actions.push({
          label: 'Publish',
          icon: Play,
          variant: 'default' as const,
          action: async () => {
            const success = await publishAssessment(assessment.id);
            if (success) onStatusChange?.();
          }
        });
        break;

      case 'published':
        actions.push({
          label: 'Monitor',
          icon: Users,
          variant: 'default' as const,
          action: () => navigate(`/monitoring?assessment=${assessment.id}`)
        });
        
        actions.push({
          label: 'Analytics',
          icon: BarChart3,
          variant: 'outline' as const,
          action: () => navigate(`/assessments/${assessment.id}/analytics`)
        });
        
        actions.push({
          label: 'Archive',
          icon: Archive,
          variant: 'outline' as const,
          action: async () => {
            const success = await archiveAssessment(assessment.id);
            if (success) onStatusChange?.();
          }
        });
        break;

      case 'archived':
        actions.push({
          label: 'Settings',
          icon: Settings,
          variant: 'outline' as const,
          action: () => navigate(`/assessments/${assessment.id}/settings`)
        });
        break;
    }

    return actions;
  };

  const StatusIcon = getStatusIcon(assessment.status);
  const actions = getAvailableActions();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{assessment.title}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {assessment.description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {assessment.proctoring_enabled && (
              <Badge variant="outline" className="text-xs">
                Proctored
              </Badge>
            )}
            <Badge variant={getStatusColor(assessment.status)} className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {assessment.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>{assessment.duration_minutes} minutes</span>
          <span>Created {new Date(assessment.created_at).toLocaleDateString()}</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                size="sm"
                onClick={action.action}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentWorkflow;