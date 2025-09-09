import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Code, 
  MessageSquare, 
  Upload,
  Mic,
  Loader2
} from 'lucide-react';

interface Question {
  id: string;
  title: string;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio' | 'interview';
  points: number;
}

interface EvaluationStatusCardProps {
  question: Question;
  status: 'pending' | 'evaluating' | 'completed' | 'error';
  score?: number;
  progress?: number;
  estimatedTime?: number;
  index: number;
}

const EvaluationStatusCard: React.FC<EvaluationStatusCardProps> = ({
  question,
  status,
  score,
  progress = 0,
  estimatedTime,
  index
}) => {
  const getQuestionIcon = () => {
    switch (question.question_type) {
      case 'mcq': return <FileText className="w-5 h-5" />;
      case 'coding': return <Code className="w-5 h-5" />;
      case 'subjective': return <MessageSquare className="w-5 h-5" />;
      case 'file_upload': return <Upload className="w-5 h-5" />;
      case 'audio': return <Mic className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'evaluating':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'border-green-200 bg-green-50';
      case 'evaluating': return 'border-blue-200 bg-blue-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Evaluation completed';
      case 'evaluating':
        return question.question_type === 'mcq' 
          ? 'Checking answer...' 
          : 'AI evaluation in progress...';
      case 'error':
        return 'Evaluation failed';
      default:
        return 'Waiting for evaluation...';
    }
  };

  const formatEstimatedTime = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `~${seconds}s`;
    return `~${Math.ceil(seconds / 60)}m`;
  };

  return (
    <Card className={`transition-all duration-300 ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-white border">
              {getQuestionIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">
                  Q{index + 1}: {question.title}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {question.question_type.toUpperCase()}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">
                {question.points} points • {getStatusText()}
              </div>

              {/* Progress bar for evaluating status */}
              {status === 'evaluating' && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Evaluating...</span>
                    {estimatedTime && (
                      <span>{formatEstimatedTime(estimatedTime)} remaining</span>
                    )}
                  </div>
                </div>
              )}

              {/* Score display for completed */}
              {status === 'completed' && score !== undefined && (
                <div className="mt-2">
                  <Badge 
                    variant={score === question.points ? "default" : "secondary"}
                    className="text-sm"
                  >
                    Score: {score}/{question.points}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="ml-3">
            {getStatusIcon()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvaluationStatusCard;