import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import StableInterviewQuestion from '@/components/stable/StableInterviewQuestion';

interface InterviewQuestionWrapperProps {
  question: {
    id: string;
    title: string;
    question_text?: string;
    config?: any;
  };
  instanceId: string;
  onComplete: (answer: any) => void;
}

export const InterviewQuestionWrapper: React.FC<InterviewQuestionWrapperProps> = (props) => {
  console.log('InterviewQuestionWrapper mounting with props:', {
    questionId: props.question.id,
    instanceId: props.instanceId
  });

  return (
    <ErrorBoundary 
      fallback={
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Interview Component Error</h3>
          <p className="text-red-600 text-sm mt-1">
            The interview component encountered an error. Please refresh the page to try again.
          </p>
        </div>
      }
    >
      <StableInterviewQuestion {...props} />
    </ErrorBoundary>
  );
};

export default InterviewQuestionWrapper;