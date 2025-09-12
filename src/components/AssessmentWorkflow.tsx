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
  AlertCircle,
  Trash2
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
  onDelete?: (assessmentId: string, assessmentTitle: string) => void;
}

const AssessmentWorkflow: React.FC<AssessmentWorkflowProps> = ({ 
  assessment, 
  onStatusChange,
  onDelete
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

  const getStandardizedActions = () => {
    const primaryActions = [];
    const secondaryActions = [];

    // Primary actions (always 2 buttons in top row)
    switch (assessment.status) {
      case 'draft':
        primaryActions.push({
          label: 'Edit',
          icon: Edit,
          variant: 'default' as const,
          action: () => navigate(`/assessments/create?edit=${assessment.id}`)
        });
        primaryActions.push({
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
        primaryActions.push({
          label: 'Monitor',
          icon: Users,
          variant: 'default' as const,
          action: () => navigate(`/monitoring?assessment=${assessment.id}`)
        });
        primaryActions.push({
          label: 'Analytics',
          icon: BarChart3,
          variant: 'default' as const,
          action: () => navigate(`/assessments/${assessment.id}/analytics`)
        });
        break;

      case 'archived':
        primaryActions.push({
          label: 'Preview',
          icon: Eye,
          variant: 'default' as const,
          action: () => navigate(`/assessments/${assessment.id}/preview`)
        });
        primaryActions.push({
          label: 'Settings',
          icon: Settings,
          variant: 'default' as const,
          action: () => navigate(`/assessments/${assessment.id}/settings`)
        });
        break;
    }

    // Secondary actions (always 2 buttons in bottom row)
    secondaryActions.push({
      label: 'Preview',
      icon: Eye,
      variant: 'outline' as const,
      action: () => navigate(`/assessments/${assessment.id}/preview`),
      hidden: assessment.status === 'archived' // Hide if already in primary
    });

    secondaryActions.push({
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

    // Add status-specific secondary action
    if (assessment.status === 'published') {
      secondaryActions.push({
        label: 'Archive',
        icon: Archive,
        variant: 'outline' as const,
        action: async () => {
          const success = await archiveAssessment(assessment.id);
          if (success) onStatusChange?.();
        }
      });
    }

    // Add delete action for all statuses
    if (onDelete) {
      secondaryActions.push({
        label: 'Delete',
        icon: Trash2,
        variant: 'outline' as const,
        action: () => onDelete(assessment.id, assessment.title),
        className: 'text-destructive hover:text-destructive'
      });
    }

    return { primaryActions, secondaryActions };
  };

  const StatusIcon = getStatusIcon(assessment.status);
  const { primaryActions, secondaryActions } = getStandardizedActions();

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
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
      
      <CardContent className="pt-0 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>{assessment.duration_minutes} minutes</span>
          <span>Created {new Date(assessment.created_at).toLocaleDateString()}</span>
        </div>
        
        <div className="space-y-3">
          {/* Primary Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            {primaryActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={`primary-${index}`}
                  variant={action.variant}
                  size="sm"
                  onClick={action.action}
                  disabled={loading}
                  className="flex items-center justify-center gap-1 h-9"
                >
                  <Icon className="w-4 h-4" />
                  {action.label}
                </Button>
              );
            })}
          </div>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            {secondaryActions
              .filter(action => !action.hidden)
              .slice(0, 2)
              .map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={`secondary-${index}`}
                    variant={action.variant}
                    size="sm"
                    onClick={action.action}
                    disabled={loading}
                    className={`flex items-center justify-center gap-1 h-9 ${action.className || ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentWorkflow;