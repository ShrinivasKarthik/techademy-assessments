import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield,
  CheckCircle,
  AlertTriangle,
  Camera,
  Monitor,
  Volume2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AssessmentIntegrityCardProps {
  proctoringData: {
    violations: any[];
    summary: {
      integrity_score: number;
      violations_count: number;
      technical_issues: string[];
    };
  };
}

const AssessmentIntegrityCard: React.FC<AssessmentIntegrityCardProps> = ({
  proctoringData
}) => {
  const [violationsExpanded, setViolationsExpanded] = useState(false);

  const getViolationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'camera':
      case 'face_detection':
      case 'face_not_detected':
        return <Camera className="h-4 w-4" />;
      case 'screen':
      case 'tab_switch':
      case 'window_focus':
        return <Monitor className="h-4 w-4" />;
      case 'audio':
      case 'microphone':
        return <Volume2 className="h-4 w-4" />;
      case 'proctoring':
      case 'monitoring':
        return <Eye className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getViolationSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatViolationTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          Assessment Integrity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Integrity Score</span>
            <Badge variant={proctoringData.summary.integrity_score >= 80 ? "default" : "destructive"}>
              {proctoringData.summary.integrity_score}%
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Security Violations</span>
            <Badge variant={proctoringData.summary.violations_count === 0 ? "default" : "destructive"}>
              {proctoringData.summary.violations_count}
            </Badge>
          </div>
          
          {proctoringData.summary.technical_issues.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Technical Issues:</span>
              <ul className="text-xs text-muted-foreground space-y-1">
                {proctoringData.summary.technical_issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Violations List */}
          <div className="space-y-2">
            <Collapsible open={violationsExpanded} onOpenChange={setViolationsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto font-medium text-sm">
                  <span>Violation Details</span>
                  {violationsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {proctoringData.violations.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
                    No violations detected during assessment
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {proctoringData.violations
                      .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime())
                      .map((violation, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getViolationSeverityColor(violation.severity)} text-sm`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getViolationIcon(violation.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium capitalize">
                                {violation.type?.replace(/_/g, ' ') || 'Security Event'}
                              </span>
                              {violation.severity && (
                                <Badge 
                                  variant={violation.severity === 'critical' ? 'destructive' : 'secondary'}
                                  className="text-xs px-2 py-0"
                                >
                                  {violation.severity}
                                </Badge>
                              )}
                              {violation.timestamp && (
                                <span className="text-xs opacity-75">
                                  {formatViolationTimestamp(violation.timestamp)}
                                </span>
                              )}
                            </div>
                            {violation.description && (
                              <p className="text-xs opacity-90">
                                {violation.description}
                              </p>
                            )}
                            {violation.details && typeof violation.details === 'object' && (
                              <div className="text-xs opacity-75 space-y-1">
                                {Object.entries(violation.details).map(([key, value]) => (
                                  <div key={key}>
                                    <strong>{key.replace(/_/g, ' ')}:</strong> {String(value)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentIntegrityCard;