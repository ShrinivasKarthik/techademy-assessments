import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Clock, 
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import TouchGestureHandler from './TouchGestureHandler';

interface Question {
  id: string;
  title: string;
  question_text: string;
  question_type: string;
  points: number;
  config: any;
}

interface Assessment {
  id: string;
  title: string;
  duration_minutes: number;
  questions: Question[];
}

interface MobileAssessmentInterfaceProps {
  assessment: Assessment;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  timeRemaining: number;
  onQuestionChange: (index: number) => void;
  onAnswerChange: (questionId: string, answer: any) => void;
  onSubmit: () => void;
  onFlagQuestion: (questionId: string) => void;
  flaggedQuestions: Set<string>;
  children: React.ReactNode;
}

const MobileAssessmentInterface: React.FC<MobileAssessmentInterfaceProps> = ({
  assessment,
  currentQuestionIndex,
  answers,
  timeRemaining,
  onQuestionChange,
  onAnswerChange,
  onSubmit,
  onFlagQuestion,
  flaggedQuestions,
  children
}) => {
  const isMobile = useIsMobile();
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const currentQuestion = assessment.questions[currentQuestionIndex];
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  const QuestionNavigator = () => (
    <Sheet open={showQuestionNav} onOpenChange={setShowQuestionNav}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Menu className="h-4 w-4 mr-2" />
          Questions
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Assessment Questions</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <div className="mb-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Answered: {answeredCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-yellow-500" />
              <span>Flagged: {flaggedQuestions.size}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {assessment.questions.map((question, index) => {
              const isAnswered = answers[question.id] !== undefined;
              const isFlagged = flaggedQuestions.has(question.id);
              const isCurrent = index === currentQuestionIndex;
              
              return (
                <Button
                  key={question.id}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  className={`relative h-12 ${
                    isAnswered ? 'border-green-500' : ''
                  } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => {
                    onQuestionChange(index);
                    setShowQuestionNav(false);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs">{index + 1}</span>
                    <div className="flex gap-1 mt-1">
                      {isAnswered && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {isFlagged && <Flag className="h-3 w-3 text-yellow-500" />}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
          
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{currentQuestionIndex + 1} of {assessment.questions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  const MobileHeader = () => (
    <div className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="p-4 space-y-3">
        {/* Timer and assessment info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={`font-mono text-sm ${
              timeRemaining < 300 ? 'text-red-500' : 'text-foreground'
            }`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <Badge variant="secondary">
            {assessment.title}
          </Badge>
        </div>

        {/* Question navigation */}
        <div className="flex items-center justify-between">
          <QuestionNavigator />
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFlagQuestion(currentQuestion.id)}
              className={flaggedQuestions.has(currentQuestion.id) ? 'text-yellow-500' : ''}
            >
              <Flag className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground">
              {currentQuestion.points} pts
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Question {currentQuestionIndex + 1}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>
    </div>
  );

  const MobileFooter = () => (
    <div className="sticky bottom-0 z-40 bg-background border-t border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={currentQuestionIndex === 0}
          onClick={() => onQuestionChange(currentQuestionIndex - 1)}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        {currentQuestionIndex === assessment.questions.length - 1 ? (
          <Button
            onClick={onSubmit}
            className="flex-1"
            variant="default"
          >
            Submit Assessment
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onQuestionChange(currentQuestionIndex + 1)}
            className="flex-1"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );

  const handleSwipeLeft = () => {
    if (currentQuestionIndex < assessment.questions.length - 1) {
      onQuestionChange(currentQuestionIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentQuestionIndex > 0) {
      onQuestionChange(currentQuestionIndex - 1);
    }
  };

  if (!isMobile) {
    // Return regular desktop interface
    return <div className="h-full">{children}</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <MobileHeader />
      
      <TouchGestureHandler
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        className="flex-1 overflow-auto"
      >
        <div className="p-4 pb-20">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg leading-tight">
                {currentQuestion.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion.question_text && (
                <div 
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
                />
              )}
              
              <div className="min-h-[200px]">
                {children}
              </div>
            </CardContent>
          </Card>
        </div>
      </TouchGestureHandler>
      
      <MobileFooter />
    </div>
  );
};

export default MobileAssessmentInterface;