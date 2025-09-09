import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Code, HelpCircle, FileText, Upload, Mic, Sparkles, Loader2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import QuestionTemplateSelector from "./QuestionTemplateSelector";
import { Question } from "@/hooks/useQuestionBank";
import EnhancedQuestionBuilders from "./EnhancedQuestionBuilders";
import { useSkills } from "@/hooks/useSkills";
import { useToast } from "@/hooks/use-toast";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigationProtection } from "@/hooks/useNavigationProtection";

interface CreateQuestionModalProps {
  question?: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionData: Partial<Question>) => Promise<void>;
}

const questionTypeOptions = [
  {
    type: 'mcq' as const,
    label: 'Multiple Choice',
    description: 'Questions with predefined answer options',
    icon: HelpCircle
  },
  {
    type: 'coding' as const,
    label: 'Coding',
    description: 'Programming challenges with test cases',
    icon: Code
  },
  {
    type: 'subjective' as const,
    label: 'Written Response',
    description: 'Open-ended text-based answers',
    icon: FileText
  },
  {
    type: 'file_upload' as const,
    label: 'File Upload',
    description: 'Document or file submission',
    icon: Upload
  },
  {
    type: 'audio' as const,
    label: 'Audio Response',
    description: 'Spoken answer recording',
    icon: Mic
  }
];

export default function CreateQuestionModal({
  question,
  isOpen,
  onClose,
  onSave,
}: CreateQuestionModalProps) {
  const defaultFormData = {
    question_text: '',
    question_type: 'mcq' as Question['question_type'],
    difficulty: 'intermediate' as Question['difficulty'],
    points: 10,
    config: {},
    tags: [] as string[],
    skills: [] as string[],
    is_template: false,
  };

  const { formData, updateFormData, isDirty, clearPersistedData } = useFormPersistence(
    question ? {
      question_text: question.question_text || '',
      question_type: question.question_type,
      difficulty: question.difficulty,
      points: question.points,
      config: question.config || {},
      tags: question.tags || [],
      skills: question.skills?.map(s => s.name) || [],
      is_template: question.is_template,
    } : defaultFormData,
    { 
      key: question ? `edit-question-${question.id}` : 'create-question-modal', 
      enabled: isOpen 
    }
  );

  const { protectedNavigate, clearProtection } = useNavigationProtection({
    enabled: isDirty && isOpen,
    message: 'You have unsaved changes to your question. Are you sure you want to close?'
  });

  const [newTag, setNewTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestingSkills, setSuggestingSkills] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const { skills: availableSkills, getOrCreateSkills, suggestSkillsForQuestion } = useSkills();
  const { toast } = useToast();

  // Only reset form when switching between edit/create modes, not on every modal open
  useEffect(() => {
    if (!isOpen) return;
    
    if (question) {
      // Editing mode - only update if it's a different question
      const questionData = {
        question_text: question.question_text || '',
        question_type: question.question_type,
        difficulty: question.difficulty,
        points: question.points,
        config: question.config || {},
        tags: question.tags || [],
        skills: question.skills?.map(s => s.name) || [],
        is_template: question.is_template,
      };
      updateFormData(questionData);
    }
  }, [question?.id]); // Only depend on question ID, not isOpen

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData({
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateFormData({
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      updateFormData({
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    updateFormData({
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleSuggestSkills = async () => {
    if (!formData.question_text.trim()) {
      toast({
        title: "Question Text Required",
        description: "Please enter question text before suggesting skills",
        variant: "destructive",
      });
      return;
    }

    setSuggestingSkills(true);
    try {
      const suggestedSkills = await suggestSkillsForQuestion(
        formData.question_text,
        formData.question_type
      );

      if (suggestedSkills.length > 0) {
        // Add only new skills that aren't already selected
        const newSkills = suggestedSkills.filter(skill => !formData.skills.includes(skill));
        if (newSkills.length > 0) {
          updateFormData({
            skills: [...formData.skills, ...newSkills]
          });
          toast({
            title: "Skills Suggested",
            description: `Added ${newSkills.length} suggested skill(s)`,
          });
        } else {
          toast({
            title: "No New Skills",
            description: "All suggested skills are already selected",
          });
        }
      } else {
        toast({
          title: "No Suggestions",
          description: "Could not generate skill suggestions for this question",
        });
      }
    } catch (error) {
      toast({
        title: "Suggestion Failed",
        description: "Failed to generate skill suggestions",
        variant: "destructive",
      });
    } finally {
      setSuggestingSkills(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    updateFormData({
      question_text: template.template_config.question_text || '',
      question_type: template.question_type,
      config: template.template_config || {},
      tags: template.template_config.tags || [],
      skills: template.template_config.skills || [],
    });
    setShowTemplates(false);
  };

  const handleConfigUpdate = (config: any) => {
    updateFormData({ config });
  };

  const handleSubmit = async () => {
    if (!formData.question_text.trim()) return;

    setLoading(true);
    try {
      // Generate title from question text (first 50 chars or full text if shorter)
      const title = formData.question_text.length > 50 
        ? formData.question_text.substring(0, 50).trim() + '...'
        : formData.question_text.trim();
      
      // Ensure skills exist in database
      const skillObjects = await getOrCreateSkills(formData.skills);
      
      await onSave({ 
        ...formData, 
        title, 
        points: 1,
        skills: skillObjects.map(s => ({ name: s.name }))
      });
      
      // Clear form persistence after successful save
      clearPersistedData();
      clearProtection();
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close with protection
  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes to your question. Are you sure you want to close?');
      if (!confirmed) return;
    }
    clearPersistedData();
    clearProtection();
    onClose();
  };

  const selectedQuestionType = questionTypeOptions.find(opt => opt.type === formData.question_type);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {question ? 'Edit Question' : 'Create New Question'}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {showTemplates ? 'Hide Templates' : 'Use Template'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Template Selector */}
          {showTemplates && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <QuestionTemplateSelector
                onSelectTemplate={handleTemplateSelect}
                selectedType={formData.question_type}
                mode="select"
              />
            </div>
          )}

          {/* Question Text - Primary Field */}
          <div className="space-y-3">
            <Label htmlFor="question-text" className="text-base font-semibold">
              Question Text *
            </Label>
            <Textarea
              id="question-text"
              value={formData.question_text}
              onChange={(e) => updateFormData({ question_text: e.target.value })}
              placeholder="What do you want to ask? Write your question here..."
              className="min-h-[120px] text-base resize-none"
              rows={5}
            />
          </div>

          {/* Question Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Question Type *</Label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {questionTypeOptions.map((option) => {
                const IconComponent = option.icon;
                const isSelected = formData.question_type === option.type;
                
                return (
                  <Card 
                    key={option.type}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => updateFormData({ 
                      question_type: option.type,
                      config: {} // Reset config when type changes
                    })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <IconComponent className={`w-5 h-5 mt-0.5 ${
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <div className="space-y-1">
                          <div className={`font-medium ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}>
                            {option.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Question Configuration */}
          {selectedQuestionType && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {selectedQuestionType.label} Configuration
              </Label>
              <EnhancedQuestionBuilders
                questionType={formData.question_type}
                config={formData.config}
                onConfigChange={handleConfigUpdate}
                questionDescription={formData.question_text}
                difficulty={formData.difficulty}
              />
            </div>
          )}

          {/* Basic Settings */}
          <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label>Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value: Question['difficulty']) => 
                    updateFormData({ difficulty: value })
                  }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Skills *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSuggestSkills}
                disabled={suggestingSkills || !formData.question_text.trim()}
              >
                {suggestingSkills ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Suggesting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" />
                    AI Suggest
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill (e.g., JavaScript, Problem Solving)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <Badge key={index} variant="default" className="cursor-pointer">
                    {skill}
                    <X
                      className="ml-1 h-3 w-3"
                      onClick={() => handleRemoveSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            {formData.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Skills help categorize and filter questions. Use AI Suggest for automatic recommendations.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer">
                    {tag}
                    <X
                      className="ml-1 h-3 w-3"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.question_text.trim() || formData.skills.length === 0}
              className="min-w-[120px]"
            >
              {loading ? 'Saving...' : question ? 'Update Question' : 'Create Question'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}