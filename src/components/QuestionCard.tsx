import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  Plus, 
  Star, 
  Clock,
  Code, 
  FileQuestion, 
  Mic, 
  Upload,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import { Question } from "@/hooks/useQuestionBank";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuestionCardProps {
  question: Question;
  onPreview: (question: Question) => void;
  onAdd?: (question: Question) => void;
  onEdit?: (question: Question) => void;
  onDelete?: (question: Question) => void;
  showAddButton?: boolean;
  showActions?: boolean;
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
      return 'bg-success/20 text-success hover:bg-success/30';
    case 'intermediate':
      return 'bg-warning/20 text-warning hover:bg-warning/30';
    case 'advanced':
      return 'bg-destructive/20 text-destructive hover:bg-destructive/30';
    default:
      return 'bg-muted/20 text-muted-foreground hover:bg-muted/30';
  }
};

export default function QuestionCard({
  question,
  onPreview,
  onAdd,
  onEdit,
  onDelete,
  showAddButton = false,
  showActions = false,
}: QuestionCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
              {getQuestionTypeIcon(question.question_type)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight mb-2 truncate">
                {question.title}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {question.question_type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="bg-accent/10 text-accent-foreground">
                  {question.points} pts
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(question)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(question)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {question.question_text && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {question.question_text}
          </p>
        )}

        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {question.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {question.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{question.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {question.skills && question.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-xs text-muted-foreground mr-1">Skills:</span>
            {question.skills.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="default" className="text-xs">
                {skill.name}
              </Badge>
            ))}
            {question.skills.length > 3 && (
              <Badge variant="default" className="text-xs">
                +{question.skills.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Used {question.usage_count} times
            </span>
            {question.quality_rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {question.quality_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(question)}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          
          {showAddButton && onAdd && (
            <Button
              size="sm"
              onClick={() => onAdd(question)}
              className="flex-1"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to Assessment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}