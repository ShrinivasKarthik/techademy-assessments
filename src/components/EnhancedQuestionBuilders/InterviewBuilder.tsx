import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface InterviewConfig {
  interview_type: 'technical' | 'behavioral' | 'situational';
  duration_minutes: number;
  instructions: string;
  evaluation_criteria: string[];
}

interface InterviewBuilderProps {
  config: Partial<InterviewConfig>;
  onConfigChange: (config: Partial<InterviewConfig>) => void;
}

const InterviewBuilder: React.FC<InterviewBuilderProps> = ({ config, onConfigChange }) => {
  const [newCriteria, setNewCriteria] = useState('');

  const interviewTypes = [
    { value: 'technical', label: 'Technical Interview', description: 'Focus on technical skills and problem-solving' },
    { value: 'behavioral', label: 'Behavioral Interview', description: 'Focus on past experiences and soft skills' },
    { value: 'situational', label: 'Situational Interview', description: 'Present hypothetical scenarios and situations' },
  ];

  const handleAddCriteria = () => {
    if (newCriteria.trim()) {
      const currentCriteria = config.evaluation_criteria || [];
      onConfigChange({
        ...config,
        evaluation_criteria: [...currentCriteria, newCriteria.trim()]
      });
      setNewCriteria('');
    }
  };

  const handleRemoveCriteria = (index: number) => {
    const currentCriteria = config.evaluation_criteria || [];
    const updatedCriteria = currentCriteria.filter((_, i) => i !== index);
    onConfigChange({
      ...config,
      evaluation_criteria: updatedCriteria
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Interview Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Interview Type */}
          <div className="space-y-2">
            <Label>Interview Type</Label>
            <Select
              value={config.interview_type || 'behavioral'}
              onValueChange={(value: InterviewConfig['interview_type']) => 
                onConfigChange({ ...config, interview_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interview type" />
              </SelectTrigger>
              <SelectContent>
                {interviewTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={config.duration_minutes || 30}
              onChange={(e) => 
                onConfigChange({ 
                  ...config, 
                  duration_minutes: parseInt(e.target.value) || 30 
                })
              }
              min={5}
              max={120}
              placeholder="30"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Interview Instructions</Label>
            <Textarea
              value={config.instructions || ''}
              onChange={(e) => 
                onConfigChange({ ...config, instructions: e.target.value })
              }
              placeholder="Enter instructions for the candidate (e.g., 'This interview will assess your problem-solving skills...')"
              rows={3}
            />
          </div>

          {/* Evaluation Criteria */}
          <div className="space-y-3">
            <Label>Evaluation Criteria</Label>
            
            <div className="flex gap-2">
              <Input
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder="Add evaluation criteria (e.g., 'Communication skills')"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCriteria();
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddCriteria}
                disabled={!newCriteria.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {config.evaluation_criteria && config.evaluation_criteria.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.evaluation_criteria.map((criteria, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer">
                    {criteria}
                    <X
                      className="ml-1 h-3 w-3"
                      onClick={() => handleRemoveCriteria(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Define what aspects the AI interviewer should evaluate during the conversation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Type:</strong> {config.interview_type || 'behavioral'}</div>
            <div><strong>Duration:</strong> {config.duration_minutes || 30} minutes</div>
            {config.instructions && (
              <div><strong>Instructions:</strong> {config.instructions}</div>
            )}
            {config.evaluation_criteria && config.evaluation_criteria.length > 0 && (
              <div>
                <strong>Criteria:</strong> {config.evaluation_criteria.join(', ')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewBuilder;