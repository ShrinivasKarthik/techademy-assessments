import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Question } from "@/hooks/useQuestionBank";
import { 
  Code, 
  FileQuestion, 
  Mic, 
  Upload,
  CheckCircle2,
  Star,
  Clock,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import MCQQuestion from "./questions/MCQQuestion";
import CodingQuestion from "./questions/CodingQuestion";
import SubjectiveQuestion from "./questions/SubjectiveQuestion";
import FileUploadQuestion from "./questions/FileUploadQuestion";
import AudioQuestion from "./questions/AudioQuestion";
import VersionControl from './VersionControl';
import TTSButton from './TTSButton';

interface QuestionPreviewProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
}

const getQuestionTypeIcon = (type: string) => {
  switch (type) {
    case 'coding':
      return <Code className="h-4 w-4" />;
    case 'mcq':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'subjective':
      return <FileQuestion className="h-4 w-4" />;
    case 'audio':
      return <Mic className="h-4 w-4" />;
    case 'file_upload':
      return <Upload className="h-4 w-4" />;
    default:
      return <FileQuestion className="h-4 w-4" />;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return 'bg-success/20 text-success';
    case 'intermediate':
      return 'bg-warning/20 text-warning';
    case 'advanced':
      return 'bg-destructive/20 text-destructive';
    default:
      return 'bg-muted/20 text-muted-foreground';
  }
};

const renderQuestionComponent = (question: Question) => {
  const questionObj = {
    id: question.id,
    title: question.title,
    question_text: question.question_text || "",
    config: question.config || {},
  };

  const commonProps = {
    question: questionObj,
    onAnswerChange: () => {}, // Preview mode - no answer changes
    disabled: true,
  };

  switch (question.question_type) {
    case 'mcq':
      return <MCQQuestion {...commonProps} />;
    case 'coding':
      return <CodingQuestion {...commonProps} />;
    case 'subjective':
      return <SubjectiveQuestion {...commonProps} />;
    case 'file_upload':
      return <FileUploadQuestion {...commonProps} />;
    case 'audio':
      return <AudioQuestion {...commonProps} />;
    default:
      return (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            Preview not available for this question type: {question.question_type}
          </p>
        </div>
      );
  }
};

export default function QuestionPreview({ question, isOpen, onClose }: QuestionPreviewProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <DialogTitle className="text-xl">{question.title}</DialogTitle>
                <TTSButton text={question.title + '. ' + (question.question_text || '')} showLabel />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  <span className="mr-1">{getQuestionTypeIcon(question.question_type)}</span>
                  {question.question_type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="bg-accent/10 text-accent-foreground">
                  {question.points} points
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Used {question.usage_count} times</span>
            </div>
            
            {question.quality_rating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span>Rating: {question.quality_rating.toFixed(1)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created: {format(new Date(question.created_at), 'MMM d, yyyy')}</span>
            </div>

            {question.last_used_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Last used: {format(new Date(question.last_used_at), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {question.skills && question.skills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Skills:</h4>
              <div className="flex flex-wrap gap-2">
                {question.skills.map((skill, index) => (
                  <Badge key={index} variant="outline">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Question Preview */}
          <div>
            <h4 className="text-sm font-medium mb-3">Question Preview:</h4>
            <div className="border rounded-lg p-4 bg-background">
              {renderQuestionComponent(question)}
            </div>
          </div>

          {/* Configuration Details */}
          {question.config && Object.keys(question.config).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Configuration:</h4>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(question.config, null, 2)}
              </pre>
            </div>
          )}

          {/* Version Control */}
          <VersionControl 
            questionId={question.id}
            currentQuestion={{
              id: question.id,
              title: question.title,
              description: question.question_text,
              config: question.config || {},
              tags: question.tags || [],
              difficulty: question.difficulty,
              points: question.points,
              version: 1, // Default version
              is_active: true, // Default to active
              change_summary: null
            }}
            onQuestionUpdated={() => {}}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}