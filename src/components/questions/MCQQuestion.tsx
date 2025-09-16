import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import TTSButton from '@/components/TTSButton';

interface MCQQuestionProps {
  question: {
    id: string;
    title: string;
    question_text: string;
    config: {
      options: Array<{
        id: string;
        text: string;
        isCorrect?: boolean;
      }>;
      allowMultiple?: boolean;
      shuffleOptions?: boolean;
    };
  };
  answer?: {
    selectedOptions: string[];
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false
}) => {
  const selectedOptions = answer?.selectedOptions || [];
  const allowMultiple = question.config.allowMultiple || false;

  const handleSingleSelect = (optionId: string) => {
    if (disabled) return;
    onAnswerChange({
      selectedOptions: [optionId]
    });
  };

  const handleMultipleSelect = (optionId: string, checked: boolean) => {
    if (disabled) return;
    
    let newSelection;
    if (checked) {
      newSelection = [...selectedOptions, optionId];
    } else {
      newSelection = selectedOptions.filter(id => id !== optionId);
    }
    
    onAnswerChange({
      selectedOptions: newSelection
    });
  };

  return (
    <div className="space-y-4">
      {question.question_text && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-base leading-relaxed flex-1">{question.question_text}</p>
          <TTSButton text={question.question_text} />
        </div>
      )}
      <div className="text-sm text-muted-foreground">
        {allowMultiple ? 'Select all that apply:' : 'Select one option:'}
      </div>

      {allowMultiple ? (
        <div className="space-y-3">
          {question.config.options.map((option) => (
            <Card key={option.id} className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedOptions.includes(option.id) ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={option.id}
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={(checked) => handleMultipleSelect(option.id, checked as boolean)}
                    disabled={disabled}
                  />
                  <Label 
                    htmlFor={option.id} 
                    className="flex-1 cursor-pointer leading-relaxed"
                  >
                    {option.text}
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <RadioGroup
          value={selectedOptions[0] || ''}
          onValueChange={handleSingleSelect}
          disabled={disabled}
        >
          <div className="space-y-3">
            {question.config.options.map((option) => (
              <Card key={option.id} className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedOptions.includes(option.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={option.id}
                      id={option.id}
                      disabled={disabled}
                    />
                    <Label 
                      htmlFor={option.id} 
                      className="flex-1 cursor-pointer leading-relaxed"
                    >
                      {option.text}
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </RadioGroup>
      )}

      {selectedOptions.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {allowMultiple ? (
            `${selectedOptions.length} option${selectedOptions.length > 1 ? 's' : ''} selected`
          ) : (
            '1 option selected'
          )}
        </div>
      )}
    </div>
  );
};

export default MCQQuestion;