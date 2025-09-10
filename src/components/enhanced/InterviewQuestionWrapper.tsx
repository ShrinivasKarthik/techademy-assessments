import React from 'react';
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

// Simplified wrapper - no error boundary to prevent mounting issues
export const InterviewQuestionWrapper: React.FC<InterviewQuestionWrapperProps> = (props) => {
  console.log('InterviewQuestionWrapper rendering with:', {
    questionId: props.question.id,
    instanceId: props.instanceId
  });

  return <StableInterviewQuestion {...props} />;
};

export default InterviewQuestionWrapper;