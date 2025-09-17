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
import { X, Plus, Code, HelpCircle, FileText, Upload, Mic, Loader2, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Question } from "@/hooks/useQuestionBank";
import EnhancedQuestionBuilders from "./EnhancedQuestionBuilders";
import { useSkills } from "@/hooks/useSkills";
import { useToast } from "@/hooks/use-toast";
import { useFormPersistence } from "@/hooks/useFormPersistence";

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

  const [newTag, setNewTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { getOrCreateSkills } = useSkills();
  const { toast } = useToast();

  // Reset form when switching between edit/create modes
  useEffect(() => {
    if (!isOpen) return;
    
    if (question) {
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
  }, [question?.id]);

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

  const isComplexType = (type: string) => {
    return ['project_based', 'coding', 'interview'].includes(type);
  };

  const handleSubmit = async () => {
    if (!formData.question_text.trim()) return;

    setLoading(true);
    try {
      // Generate title from question text
      const title = formData.question_text.length > 50 
        ? formData.question_text.substring(0, 50).trim() + '...'
        : formData.question_text.trim();
      
      // Ensure skills exist in database
      const skillObjects = await getOrCreateSkills(formData.skills);
      
      // Create minimal question data for simple types or editing
      const questionData = { 
        ...formData, 
        title,
        skills: skillObjects.map(s => ({ name: s.name }))
      };

      await onSave(questionData);
      
      // Clear form persistence after successful save
      clearPersistedData();
      
      toast({
        title: question ? "Question Updated" : "Question Created",
        description: question ? "Question has been updated successfully." : "Question has been created successfully.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    clearPersistedData();
    onClose();
  };

  const selectedQuestionType = questionTypeOptions.find(opt => opt.type === formData.question_type);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {question ? 'Edit Question' : 'Create New Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question Text */}
          <div className="space-y-3">
            <Label htmlFor="question-text" className="text-base font-semibold">
              Question Text *
            </Label>
            <Textarea
              id="question-text"
              value={formData.question_text}
              onChange={(e) => updateFormData({ question_text: e.target.value })}
              placeholder="What do you want to ask? Write your question here..."
              className="min-h-[100px] text-base resize-none"
              rows={4}
            />
          </div>

          {/* Question Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Question Type *</Label>
            <div className="grid grid-cols-2 gap-3">
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
                    onClick={() => updateFormData({ question_type: option.type })}
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

          {/* Simple Question Configuration */}
          {!isComplexType(formData.question_type) && selectedQuestionType && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {selectedQuestionType.label} Configuration
              </Label>
              <EnhancedQuestionBuilders
                questionType={formData.question_type}
                config={formData.config}
                onConfigChange={(config) => updateFormData({ config })}
                questionDescription={formData.question_text}
                difficulty={formData.difficulty}
              />
            </div>
          )}

          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Difficulty */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Difficulty</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value) => updateFormData({ difficulty: value as Question['difficulty'] })}
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

            {/* Points */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Points</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => updateFormData({ points: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>

          {/* Tags Management */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tags</Label>
            
            {/* Tags List */}
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>

            {/* Add Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Skills Management */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Required Skills</Label>
            
            {/* Skills List */}
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveSkill(skill)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>

            {/* Add Skill */}
            <div className="flex gap-2">
              <Input
                placeholder="Add required skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          
          {isComplexType(formData.question_type) && !question ? (
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.question_text.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create & Configure
                  <Code className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.question_text.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {question ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                question ? 'Update Question' : 'Create Question'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}