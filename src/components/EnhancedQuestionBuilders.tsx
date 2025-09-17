import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Code, FileText, Upload, Mic, HelpCircle, Sparkles, MessageCircle } from 'lucide-react';
import AdvancedCodingQuestionBuilder from './questions/AdvancedCodingQuestionBuilder';
import InterviewBuilder from './EnhancedQuestionBuilders/InterviewBuilder';
import ProjectBasedQuestionBuilder from './ProjectBasedQuestionBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type QuestionType = 'project_based' | 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio' | 'interview';

interface QuestionConfig {
  coding?: {
    language: string;
    starterCode: string;
    testCases: Array<{
      input: string;
      expectedOutput: string;
      description: string;
    }>;
  };
  mcq?: {
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
    allowMultiple: boolean;
    shuffleOptions: boolean;
  };
  subjective?: {
    minWords: number;
    maxWords: number;
    placeholder: string;
    rubric: Array<{
      criteria: string;
      description: string;
      points: number;
    }>;
  };
  file_upload?: {
    allowedTypes: string[];
    maxSizeBytes: number;
    maxFiles: number;
    instructions: string;
  };
  audio?: {
    maxDurationSeconds: number;
    allowRerecording: boolean;
    instructions: string;
  };
  interview?: {
    interview_type: 'technical' | 'behavioral' | 'situational';
    duration_minutes: number;
    instructions: string;
    evaluation_criteria: string[];
  };
}

interface EnhancedQuestionBuildersProps {
  questionType: QuestionType;
  config: any;
  onConfigChange: (config: any) => void;
  questionDescription?: string;
  difficulty?: string;
  questionId?: string;
  onAutoSave?: () => Promise<void>;
}

const EnhancedQuestionBuilders: React.FC<EnhancedQuestionBuildersProps> = ({
  questionType,
  config,
  onConfigChange,
  questionDescription = '',
  difficulty = 'intermediate',
  questionId,
  onAutoSave
}) => {
  const { toast } = useToast();
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const renderProjectBasedBuilder = () => {
    const projectConfig = config || {
      technology: '',
      problemDescription: '',
      projectFiles: [],
      testScenarios: [],
      evaluationCriteria: [],
      estimatedDuration: 60,
      allowedResources: []
    };

    return (
      <ProjectBasedQuestionBuilder
        config={projectConfig}
        onConfigChange={onConfigChange}
        questionId={questionId}
        questionDescription={questionDescription}
        difficulty={difficulty}
        onAutoSave={onAutoSave}
      />
    );
  };

  const renderCodingBuilder = () => {
    const codingConfig = (config && Object.keys(config).length > 0) ? config : {
      language: 'javascript',
      supportedLanguages: ['javascript'],
      starterCode: '',
      testCases: [],
      hints: [],
      commonMistakes: [],
      optimizationTips: [],
      templates: [],
      timeLimit: undefined,
      memoryLimit: undefined,
      rubric: undefined
    };

    return (
      <AdvancedCodingQuestionBuilder
        config={codingConfig}
        onConfigChange={onConfigChange}
        questionDescription={questionDescription}
        difficulty={difficulty}
      />
    );
  };

  const renderMCQBuilder = () => {
    const mcqConfig = (config && config.options) ? config as QuestionConfig['mcq'] : {
      options: [],
      allowMultiple: false,
      shuffleOptions: false
    };

    const updateConfig = (updates: Partial<NonNullable<QuestionConfig['mcq']>>) => {
      onConfigChange({ ...mcqConfig, ...updates });
    };

    const addOption = () => {
      const newOption = {
        id: Date.now().toString(),
        text: '',
        isCorrect: false
      };
      updateConfig({
        options: [...mcqConfig.options, newOption]
      });
    };

    const updateOption = (index: number, field: string, value: any) => {
      const newOptions = [...mcqConfig.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      updateConfig({ options: newOptions });
    };

    const removeOption = (index: number) => {
      updateConfig({
        options: mcqConfig.options.filter((_, i) => i !== index)
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowMultiple"
              checked={mcqConfig.allowMultiple}
              onCheckedChange={(checked) => updateConfig({ allowMultiple: checked as boolean })}
            />
            <Label htmlFor="allowMultiple">Allow multiple selections</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="shuffleOptions"
              checked={mcqConfig.shuffleOptions}
              onCheckedChange={(checked) => updateConfig({ shuffleOptions: checked as boolean })}
            />
            <Label htmlFor="shuffleOptions">Shuffle options</Label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Answer Options</Label>
            <Button onClick={addOption} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </Button>
          </div>

          {(mcqConfig.options || []).map((option, index) => (
            <Card key={option.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={(checked) => updateOption(index, 'isCorrect', checked)}
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(index, 'text', e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  <Badge variant={option.isCorrect ? "default" : "outline"}>
                    {option.isCorrect ? 'Correct' : 'Incorrect'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {(mcqConfig.options || []).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No options added yet. Add at least 2 options for a multiple choice question.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSubjectiveBuilder = () => {
    const subjectiveConfig = (config && config.minWords !== undefined) ? config as QuestionConfig['subjective'] : {
      minWords: 0,
      maxWords: 0,
      placeholder: '',
      rubric: []
    };

    const updateConfig = (updates: Partial<NonNullable<QuestionConfig['subjective']>>) => {
      onConfigChange({ ...subjectiveConfig, ...updates });
    };

    const addRubricCriteria = () => {
      const newCriteria = {
        criteria: '',
        description: '',
        points: 5
      };
      updateConfig({
        rubric: [...subjectiveConfig.rubric, newCriteria]
      });
    };

    const updateRubricCriteria = (index: number, field: string, value: any) => {
      const newRubric = [...subjectiveConfig.rubric];
      newRubric[index] = { ...newRubric[index], [field]: value };
      updateConfig({ rubric: newRubric });
    };

    const removeRubricCriteria = (index: number) => {
      updateConfig({
        rubric: subjectiveConfig.rubric.filter((_, i) => i !== index)
      });
    };

    const generateAIRubric = async () => {
      if (!questionDescription.trim()) {
        toast({
          title: "Question Description Required",
          description: "Please provide a question description to generate an AI rubric",
          variant: "destructive"
        });
        return;
      }

      setIsGeneratingRubric(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-rubric', {
          body: {
            questionType: 'subjective',
            questionDescription,
            difficulty,
            skills: [] // Could be extracted from context
          }
        });

        if (error) throw error;

        const rubric = data.rubric;
        if (rubric && rubric.criteria) {
          updateConfig({ rubric: rubric.criteria });
          toast({
            title: "AI Rubric Generated",
            description: `Generated ${rubric.criteria.length} evaluation criteria`,
          });
        }
      } catch (error) {
        console.error('Error generating rubric:', error);
        toast({
          title: "Rubric Generation Failed",
          description: "Unable to generate AI rubric. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsGeneratingRubric(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Words</Label>
            <Input
              type="number"
              value={subjectiveConfig.minWords || ''}
              onChange={(e) => updateConfig({ minWords: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Words</Label>
            <Input
              type="number"
              value={subjectiveConfig.maxWords || ''}
              onChange={(e) => updateConfig({ maxWords: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Placeholder Text</Label>
          <Input
            value={subjectiveConfig.placeholder}
            onChange={(e) => updateConfig({ placeholder: e.target.value })}
            placeholder="Enter placeholder text for the answer area..."
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base">Evaluation Rubric</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={generateAIRubric} 
                size="sm"
                disabled={isGeneratingRubric || !questionDescription.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGeneratingRubric ? 'Generating...' : 'AI Generate'}
              </Button>
              <Button onClick={addRubricCriteria} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Criteria
              </Button>
            </div>
          </div>

          {(subjectiveConfig.rubric || []).map((criteria, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Criteria {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRubricCriteria(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Input
                      value={criteria.criteria}
                      onChange={(e) => updateRubricCriteria(index, 'criteria', e.target.value)}
                      placeholder="Criteria name"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={criteria.points}
                      onChange={(e) => updateRubricCriteria(index, 'points', parseInt(e.target.value) || 0)}
                      placeholder="Points"
                    />
                  </div>
                </div>
                <Textarea
                  value={criteria.description}
                  onChange={(e) => updateRubricCriteria(index, 'description', e.target.value)}
                  placeholder="Description of what this criteria evaluates"
                  className="text-sm"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderFileUploadBuilder = () => {
    const fileConfig = (config && config.allowedTypes !== undefined) ? config as QuestionConfig['file_upload'] : {
      allowedTypes: [],
      maxSizeBytes: 10 * 1024 * 1024,
      maxFiles: 1,
      instructions: ''
    };

    const updateConfig = (updates: Partial<NonNullable<QuestionConfig['file_upload']>>) => {
      onConfigChange({ ...fileConfig, ...updates });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Maximum Files</Label>
            <Input
              type="number"
              value={fileConfig.maxFiles}
              onChange={(e) => updateConfig({ maxFiles: parseInt(e.target.value) || 1 })}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              value={(fileConfig.maxSizeBytes / (1024 * 1024)).toFixed(0)}
              onChange={(e) => updateConfig({ maxSizeBytes: (parseInt(e.target.value) || 10) * 1024 * 1024 })}
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Allowed File Types</Label>
          <Input
            value={fileConfig.allowedTypes.join(', ')}
            onChange={(e) => updateConfig({ allowedTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            placeholder="e.g., .pdf, .doc, .jpg, image/*"
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple types with commas. Use MIME types (image/*) or extensions (.pdf)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Instructions</Label>
          <Textarea
            value={fileConfig.instructions}
            onChange={(e) => updateConfig({ instructions: e.target.value })}
            placeholder="Provide specific instructions for file uploads..."
          />
        </div>
      </div>
    );
  };

  const renderAudioBuilder = () => {
    const audioConfig = (config && config.maxDurationSeconds !== undefined) ? config as QuestionConfig['audio'] : {
      maxDurationSeconds: 300,
      allowRerecording: true,
      instructions: ''
    };

    const updateConfig = (updates: Partial<NonNullable<QuestionConfig['audio']>>) => {
      onConfigChange({ ...audioConfig, ...updates });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Max Duration (seconds)</Label>
            <Input
              type="number"
              value={audioConfig.maxDurationSeconds}
              onChange={(e) => updateConfig({ maxDurationSeconds: parseInt(e.target.value) || 300 })}
              min="10"
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="allowRerecording"
              checked={audioConfig.allowRerecording}
              onCheckedChange={(checked) => updateConfig({ allowRerecording: checked as boolean })}
            />
            <Label htmlFor="allowRerecording">Allow re-recording</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Instructions</Label>
          <Textarea
            value={audioConfig.instructions}
            onChange={(e) => updateConfig({ instructions: e.target.value })}
            placeholder="Provide specific instructions for the audio response..."
          />
        </div>
      </div>
    );
  };

  const getIcon = () => {
    switch (questionType) {
      case 'project_based':
        return <Code className="w-5 h-5" />;
      case 'mcq':
        return <HelpCircle className="w-5 h-5" />;
      case 'subjective':
        return <FileText className="w-5 h-5" />;
      case 'file_upload':
        return <Upload className="w-5 h-5" />;
      case 'audio':
        return <Mic className="w-5 h-5" />;
      case 'interview':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (questionType) {
      case 'project_based':
        return 'Project-Based Assessment Configuration';
      case 'mcq':
        return 'Multiple Choice Configuration';
      case 'subjective':
        return 'Subjective Question Configuration';
      case 'file_upload':
        return 'File Upload Configuration';
      case 'audio':
        return 'Audio Response Configuration';
      case 'interview':
        return 'Interview Configuration';
      default:
        return 'Question Configuration';
    }
  };

  const renderInterviewBuilder = () => {
    const interviewConfig = (config && config.interview_type) ? config : {
      interview_type: 'behavioral',
      duration_minutes: 30,
      instructions: '',
      evaluation_criteria: []
    };

    return (
      <InterviewBuilder
        config={interviewConfig}
        onConfigChange={onConfigChange}
      />
    );
  };

  const renderBuilder = () => {
    switch (questionType) {
      case 'project_based':
        return renderProjectBasedBuilder();
      case 'mcq':
        return renderMCQBuilder();
      case 'subjective':
        return renderSubjectiveBuilder();
      case 'file_upload':
        return renderFileUploadBuilder();
      case 'audio':
        return renderAudioBuilder();
      case 'interview':
        return renderInterviewBuilder();
      default:
        return <div>Select a question type to configure</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getIcon()}
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderBuilder()}
      </CardContent>
    </Card>
  );
};

export default EnhancedQuestionBuilders;