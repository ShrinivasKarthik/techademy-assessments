import React from 'react';
import EnhancedAssessmentTaking from './EnhancedAssessmentTaking';

interface Question {
  id: string;
  title: string;
  description: string;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  difficulty: string;
  points: number;
  order_index: number;
  config: any;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  questions: Question[];
}

interface AssessmentInstance {
  id: string;
  started_at: string;
  time_remaining_seconds: number;
  current_question_index: number;
  status: 'in_progress' | 'submitted' | 'evaluated';
}

interface TakeAssessmentProps {
  assessmentId: string;
}

const TakeAssessment: React.FC<TakeAssessmentProps> = ({ assessmentId }) => {
  return <EnhancedAssessmentTaking assessmentId={assessmentId} />;
};

export default TakeAssessment;