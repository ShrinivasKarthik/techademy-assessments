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
import { X, Plus, Code, HelpCircle, FileText, Upload, Mic } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Question } from "@/hooks/useQuestionBank";
import EnhancedQuestionBuilders from "./EnhancedQuestionBuilders";

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
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq' as Question['question_type'],
    difficulty: 'intermediate' as Question['difficulty'],
    points: 10,
    config: {},
    tags: [] as string[],
    is_template: false,
  });

  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question) {
      setFormData({
        question_text: question.question_text || '',
        question_type: question.question_type,
        difficulty: question.difficulty,
        points: question.points,
        config: question.config || {},
        tags: question.tags || [],
        is_template: question.is_template,
      });
    } else {
      // Reset form for new question
      setFormData({
        question_text: '',
        question_type: 'mcq',
        difficulty: 'intermediate',
        points: 10,
        config: {},
        tags: [],
        is_template: false,
      });
    }
  }, [question, isOpen]);

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleConfigUpdate = (config: any) => {
    setFormData(prev => ({ ...prev, config }));
  };

  const handleSubmit = async () => {
    if (!formData.question_text.trim()) return;

    setLoading(true);
    try {
      // Generate title from question text (first 50 chars or full text if shorter)
      const title = formData.question_text.length > 50 
        ? formData.question_text.substring(0, 50).trim() + '...'
        : formData.question_text.trim();
      
      await onSave({ ...formData, title, points: 1 });
    } finally {
      setLoading(false);
    }
  };

  const selectedQuestionType = questionTypeOptions.find(opt => opt.type === formData.question_type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {question ? 'Edit Question' : 'Create New Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Question Text - Primary Field */}
          <div className="space-y-3">
            <Label htmlFor="question-text" className="text-base font-semibold">
              Question Text *
            </Label>
            <Textarea
              id="question-text"
              value={formData.question_text}
              onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
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
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      question_type: option.type,
                      config: {} // Reset config when type changes
                    }))}
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
                  setFormData(prev => ({ ...prev, difficulty: value }))
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
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.question_text.trim()}
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