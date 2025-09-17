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
import { Menu, Flag, CheckCircle, Circle, X, Lightbulb } from 'lucide-react';
import { useFloatingNavigationState } from '@/hooks/useFloatingNavigationState';
import { useQuestionTransition } from '@/hooks/useQuestionTransition';

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
  isProjectQuestion?: boolean;
}

const FloatingQuestionNavigator: React.FC<FloatingQuestionNavigatorProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  flaggedQuestions,
  onQuestionChange,
  disabled = false,
  className = "",
  isProjectQuestion = false
}) => {
  const { 
    isOpen, 
    showHint, 
    position, 
    setIsOpen, 
    updatePosition, 
    dismissHint 
  } = useFloatingNavigationState(isProjectQuestion);
  
  const { isTransitioning, pendingQuestionIndex, startTransition } = useQuestionTransition();

  // Keyboard shortcut for quick access
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, setIsOpen]);

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
    if (disabled || isTransitioning) return;
    
    startTransition(index, (questionIndex) => {
      onQuestionChange(questionIndex);
      setIsOpen(false);
    });
  };

  return (
    <>
      {/* First-time hint tooltip */}
      {showHint && isProjectQuestion && (
        <div 
          className="fixed z-[60] animate-fade-in"
          style={{ 
            top: position.top + 50, 
            left: position.left,
            maxWidth: '280px'
          }}
        >
          <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-xl border relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissHint}
              className="absolute -top-1 -right-1 h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="w-3 h-3" />
            </Button>
            <div className="flex items-start gap-2 pr-4">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">Navigation Tip</div>
                <div className="text-primary-foreground/90">
                  Press <kbd className="px-1 py-0.5 bg-primary-foreground/20 rounded text-xs">Ctrl+Q</kbd> to quickly access question navigation
                </div>
              </div>
            </div>
            <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-primary"></div>
          </div>
        </div>
      )}

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`fixed z-50 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90 transition-all duration-200 animate-fade-in ${
              isTransitioning ? 'animate-pulse' : ''
            } ${className}`}
            style={{
              top: position.top,
              left: position.left
            }}
            disabled={disabled || isTransitioning}
          >
            <Menu className="w-4 h-4 mr-2" />
            {isTransitioning && pendingQuestionIndex !== null ? (
              <>Loading Question {pendingQuestionIndex + 1}...</>
            ) : (
              <>Question {currentQuestionIndex + 1} of {questions.length}</>
            )}
          </Button>
        </DrawerTrigger>
      
        <DrawerContent className="max-h-[80vh] animate-slide-in-right">
          <DrawerHeader>
            <DrawerTitle>Navigate Questions</DrawerTitle>
            <DrawerDescription>
              Select a question to navigate to. Green = answered, Yellow = flagged.
              {isProjectQuestion && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Auto-hides after 3 seconds of inactivity
                </span>
              )}
            </DrawerDescription>
          </DrawerHeader>
        
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Loading overlay */}
            {isTransitioning && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div className="text-sm text-muted-foreground">
                    Loading Question {pendingQuestionIndex !== null ? pendingQuestionIndex + 1 : '...'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick Navigation Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-6">
              {questions.map((question, index) => {
                const status = getQuestionStatus(question, index);
                const isTransitionTarget = pendingQuestionIndex === index;
                return (
                  <Button
                    key={question.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuestionSelect(index)}
                    disabled={disabled || isTransitioning}
                    className={`relative w-12 h-12 p-0 transition-all duration-200 hover:scale-105 ${getStatusColor(status)} ${
                      isTransitionTarget ? 'animate-pulse ring-2 ring-primary' : ''
                    }`}
                  >
                    {index + 1}
                    {flaggedQuestions.has(question.id) && (
                      <Flag className="w-2 h-2 absolute -top-1 -right-1 text-yellow-600" />
                    )}
                    {answers[question.id] && (
                      <CheckCircle className="w-2 h-2 absolute -bottom-1 -right-1 text-green-600" />
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
                const isTransitionTarget = pendingQuestionIndex === index;
                return (
                  <div
                    key={question.id}
                    onClick={() => handleQuestionSelect(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm ${
                      status === 'current' 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-muted/50'
                    } ${disabled || isTransitioning ? 'pointer-events-none opacity-50' : ''} ${
                      isTransitionTarget ? 'animate-pulse ring-2 ring-primary/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <div>
                          <div className="font-medium text-sm">
                            Question {index + 1}: {question.title}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs animate-fade-in">
                              {question.question_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs animate-fade-in">
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs animate-fade-in">
                              {question.points}pts
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {flaggedQuestions.has(question.id) && (
                          <Flag className="w-4 h-4 text-yellow-600 animate-fade-in" />
                        )}
                        {answers[question.id] && (
                          <CheckCircle className="w-4 h-4 text-green-600 animate-fade-in" />
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
    </>
  );
};

export default FloatingQuestionNavigator;