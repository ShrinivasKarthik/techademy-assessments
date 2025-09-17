import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Menu, Flag, CheckCircle, Circle } from 'lucide-react';

interface Question {
  id: string;
  title: string;
  question_type: string;
  difficulty: string;
  points: number;
  order_index: number;
}

interface FloatingQuestionNavigatorProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, any>;
  flaggedQuestions: Set<string>;
  onQuestionChange: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

const FloatingQuestionNavigator: React.FC<FloatingQuestionNavigatorProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  flaggedQuestions,
  onQuestionChange,
  disabled = false,
  className = ""
}) => {
  const [open, setOpen] = React.useState(false);

  // Keyboard shortcut for quick access
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      // Close on Escape
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open]);

  const getQuestionStatus = (question: Question, index: number) => {
    if (index === currentQuestionIndex) return 'current';
    if (answers[question.id]) return 'answered';
    if (flaggedQuestions.has(question.id)) return 'flagged';
    return 'unanswered';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return <Circle className="w-4 h-4 fill-primary text-primary" />;
      case 'answered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'flagged':
        return <Flag className="w-4 h-4 text-yellow-600" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-primary text-primary-foreground';
      case 'answered':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'flagged':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const handleQuestionSelect = (index: number) => {
    onQuestionChange(index);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90 ${className}`}
          disabled={disabled}
        >
          <Menu className="w-4 h-4 mr-2" />
          Question {currentQuestionIndex + 1} of {questions.length}
        </Button>
      </DrawerTrigger>
      
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Navigate Questions</DrawerTitle>
          <DrawerDescription>
            Select a question to navigate to. Green = answered, Yellow = flagged.
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Quick Navigation Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-6">
            {questions.map((question, index) => {
              const status = getQuestionStatus(question, index);
              return (
                <Button
                  key={question.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuestionSelect(index)}
                  disabled={disabled}
                  className={`relative w-12 h-12 p-0 ${getStatusColor(status)}`}
                >
                  {index + 1}
                  {flaggedQuestions.has(question.id) && (
                    <Flag className="w-2 h-2 absolute -top-1 -right-1 text-yellow-600" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Detailed Question List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Question Details</h4>
            {questions.map((question, index) => {
              const status = getQuestionStatus(question, index);
              return (
                <div
                  key={question.id}
                  onClick={() => handleQuestionSelect(index)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    status === 'current' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <div>
                        <div className="font-medium text-sm">
                          Question {index + 1}: {question.title}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {question.question_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.points}pts
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {flaggedQuestions.has(question.id) && (
                        <Flag className="w-4 h-4 text-yellow-600" />
                      )}
                      {answers[question.id] && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default FloatingQuestionNavigator;