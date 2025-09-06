import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, Eye, Send } from 'lucide-react';
import { useAssessmentValidation } from '@/hooks/useAssessmentValidation';

interface QualityGate {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  required: boolean;
}

interface AssessmentQualityGatesProps {
  assessmentId: string;
  onPublish?: () => void;
  onPreview?: () => void;
}

const AssessmentQualityGates: React.FC<AssessmentQualityGatesProps> = ({
  assessmentId,
  onPublish,
  onPreview
}) => {
  const [qualityGates, setQualityGates] = useState<QualityGate[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [canPublish, setCanPublish] = useState(false);
  const { validateAssessment, publishAssessment, validating } = useAssessmentValidation();

  useEffect(() => {
    runQualityChecks();
  }, [assessmentId]);

  const runQualityChecks = async () => {
    const validation = await validateAssessment(assessmentId);
    
    const gates: QualityGate[] = [
      {
        id: 'basic_info',
        title: 'Basic Information',
        description: 'Title, description, and duration are properly set',
        status: validation.errors.some(e => ['title', 'description', 'duration'].includes(e.field)) ? 'fail' : 'pass',
        required: true
      },
      {
        id: 'questions',
        title: 'Questions',
        description: 'At least one active question exists',
        status: validation.errors.some(e => e.field === 'questions') ? 'fail' : 'pass',
        required: true
      },
      {
        id: 'question_content',
        title: 'Question Content',
        description: 'All questions have proper titles and content',
        status: validation.errors.some(e => e.field.includes('question_') && e.field.includes('_title')) ? 'fail' : 'pass',
        required: true
      },
      {
        id: 'points',
        title: 'Scoring System',
        description: 'Total points are greater than 0',
        status: validation.errors.some(e => e.field === 'total_points') ? 'fail' : 'pass',
        required: true
      },
      {
        id: 'mcq_validation',
        title: 'MCQ Validation',
        description: 'MCQ questions have options and correct answers',
        status: validation.errors.some(e => e.field.includes('_options') || e.field.includes('_correct')) ? 'fail' : 'pass',
        required: false
      }
    ];

    setQualityGates(gates);

    // Calculate overall score
    const passedGates = gates.filter(gate => gate.status === 'pass').length;
    const score = Math.round((passedGates / gates.length) * 100);
    setOverallScore(score);

    // Check if can publish (all required gates must pass)
    const requiredGates = gates.filter(gate => gate.required);
    const passedRequiredGates = requiredGates.filter(gate => gate.status === 'pass');
    setCanPublish(passedRequiredGates.length === requiredGates.length);
  };

  const handlePublish = async () => {
    const success = await publishAssessment(assessmentId);
    if (success) {
      onPublish?.(/* */);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, required: boolean) => {
    const baseClasses = "text-xs";
    
    if (status === 'pass') {
      return <Badge variant="default" className={`${baseClasses} bg-green-100 text-green-800`}>Passed</Badge>;
    }
    
    if (status === 'fail') {
      return (
        <Badge 
          variant="destructive" 
          className={`${baseClasses} ${required ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
        >
          {required ? 'Failed' : 'Warning'}
        </Badge>
      );
    }
    
    return <Badge variant="secondary" className={baseClasses}>Pending</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Quality Assessment
          <Button
            variant="outline"
            onClick={runQualityChecks}
            disabled={validating}
            size="sm"
          >
            {validating ? 'Checking...' : 'Refresh'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Quality Score</span>
            <span className="text-2xl font-bold">{overallScore}%</span>
          </div>
          <Progress value={overallScore} className="w-full" />
          <p className="text-sm text-muted-foreground">
            {canPublish 
              ? "Your assessment meets all requirements for publication."
              : "Complete the required quality gates below to publish your assessment."
            }
          </p>
        </div>

        {/* Quality Gates */}
        <div className="space-y-3">
          <h4 className="font-medium">Quality Gates</h4>
          {qualityGates.map((gate) => (
            <div key={gate.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(gate.status)}
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {gate.title}
                    {gate.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">{gate.description}</p>
                </div>
              </div>
              {getStatusBadge(gate.status, gate.required)}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPreview}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview Assessment
          </Button>
          
          <Button
            onClick={handlePublish}
            disabled={!canPublish || validating}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {validating ? 'Publishing...' : 'Publish Assessment'}
          </Button>
        </div>

        {!canPublish && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Publishing blocked:</strong> Please address all required quality gates before publishing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentQualityGates;