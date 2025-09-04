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
import { X, Plus } from "lucide-react";
import { Question } from "@/hooks/useQuestionBank";
import EnhancedQuestionBuilders from "./EnhancedQuestionBuilders";

interface CreateQuestionModalProps {
  question?: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionData: Partial<Question>) => Promise<void>;
}

export default function CreateQuestionModal({
  question,
  isOpen,
  onClose,
  onSave,
}: CreateQuestionModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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
        title: question.title,
        description: question.description || '',
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
        title: '',
        description: '',
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
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit Question' : 'Create New Question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter question title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={formData.points}
                onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter question description or instructions"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select 
                value={formData.question_type} 
                onValueChange={(value: Question['question_type']) => 
                  setFormData(prev => ({ ...prev, question_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                  <SelectItem value="audio">Audio Response</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          <div className="space-y-2">
            <Label>Tags</Label>
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
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
          </div>

          {/* Question Configuration */}
          <div className="space-y-2">
            <Label>Question Configuration</Label>
            <div className="border rounded-lg p-4">
            <EnhancedQuestionBuilders
              questionType={formData.question_type}
              config={formData.config}
              onConfigChange={handleConfigUpdate}
            />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.title.trim()}>
              {loading ? 'Saving...' : question ? 'Update Question' : 'Create Question'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}