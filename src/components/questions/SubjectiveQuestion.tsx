import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface SubjectiveQuestionProps {
  question: {
    id: string;
    title: string;
    question_text: string;
    config: {
      minWords?: number;
      maxWords?: number;
      placeholder?: string;
      rubric?: Array<{
        criteria: string;
        description: string;
        points: number;
      }>;
    };
  };
  answer?: {
    text: string;
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

const SubjectiveQuestion: React.FC<SubjectiveQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false
}) => {
  const [text, setText] = useState(answer?.text || '');
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [text]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    onAnswerChange({
      text: newText
    });
  };

  const getWordCountColor = () => {
    if (question.config.minWords && wordCount < question.config.minWords) {
      return 'text-red-600';
    }
    if (question.config.maxWords && wordCount > question.config.maxWords) {
      return 'text-red-600';
    }
    return 'text-muted-foreground';
  };

  const getWordCountStatus = () => {
    if (question.config.minWords && wordCount < question.config.minWords) {
      return `${question.config.minWords - wordCount} more words needed`;
    }
    if (question.config.maxWords && wordCount > question.config.maxWords) {
      return `${wordCount - question.config.maxWords} words over limit`;
    }
    return 'Word count is good';
  };

  return (
    <div className="space-y-4">
      {/* Writing Area */}
      <div>
        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
          placeholder={question.config.placeholder || 'Write your answer here...'}
          className="min-h-[200px] resize-y"
        />
      </div>

      {/* Word Count */}
      <div className="flex items-center justify-between text-sm">
        <span className={getWordCountColor()}>
          {wordCount} words
          {question.config.minWords && ` (min: ${question.config.minWords})`}
          {question.config.maxWords && ` (max: ${question.config.maxWords})`}
        </span>
        
        {(question.config.minWords || question.config.maxWords) && (
          <Badge variant={
            (question.config.minWords && wordCount < question.config.minWords) ||
            (question.config.maxWords && wordCount > question.config.maxWords)
              ? "destructive" 
              : "secondary"
          }>
            {getWordCountStatus()}
          </Badge>
        )}
      </div>

      {/* Rubric */}
      {question.config.rubric && question.config.rubric.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Evaluation Criteria:</h4>
            <div className="space-y-3">
              {question.config.rubric.map((criterion, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-sm">{criterion.criteria}</h5>
                    <Badge variant="outline" className="text-xs">
                      {criterion.points} pts
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {criterion.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubjectiveQuestion;