import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Package,
  Copy,
  Archive,
  Trash2,
  Edit,
  Tag,
  FolderPlus,
  CheckSquare,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  title: string;
  question_type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  is_active?: boolean;
}

interface BatchOperationsProps {
  questions: Question[];
  onQuestionsUpdated: () => void;
}

export default function BatchOperations({ questions, onQuestionsUpdated }: BatchOperationsProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    tags: '',
    difficulty: '',
    points: '',
  });
  const [targetCollection, setTargetCollection] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collections, setCollections] = useState<any[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const bulkArchive = async () => {
    if (!window.confirm(`Archive ${selectedQuestions.size} questions?`)) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false, archived_at: new Date().toISOString() })
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;

      toast({
        title: "Questions Archived",
        description: `Successfully archived ${selectedQuestions.size} questions`,
      });

      setSelectedQuestions(new Set());
      onQuestionsUpdated();
    } catch (error) {
      console.error('Error archiving questions:', error);
      toast({
        title: "Archive Failed",
        description: "Failed to archive questions",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedQuestions.size} questions? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;

      toast({
        title: "Questions Deleted",
        description: `Successfully deleted ${selectedQuestions.size} questions`,
      });

      setSelectedQuestions(new Set());
      onQuestionsUpdated();
    } catch (error) {
      console.error('Error deleting questions:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete questions",
        variant: "destructive",
      });
    }
  };

  const bulkEdit = async () => {
    try {
      const updates: any = {};
      
      if (bulkEditData.difficulty) {
        updates.difficulty = bulkEditData.difficulty;
      }
      
      if (bulkEditData.points) {
        updates.points = parseInt(bulkEditData.points);
      }

      if (bulkEditData.tags) {
        const tags = bulkEditData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        updates.tags = tags;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "No Changes",
          description: "Please specify at least one field to update",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('questions')
        .update(updates)
        .in('id', Array.from(selectedQuestions));

      if (error) throw error;

      toast({
        title: "Questions Updated",
        description: `Successfully updated ${selectedQuestions.size} questions`,
      });

      setShowBulkEditDialog(false);
      setBulkEditData({ tags: '', difficulty: '', points: '' });
      setSelectedQuestions(new Set());
      onQuestionsUpdated();
    } catch (error) {
      console.error('Error updating questions:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update questions",
        variant: "destructive",
      });
    }
  };

  const bulkCopy = async () => {
    try {
      const questionsToCopy = questions.filter(q => selectedQuestions.has(q.id));
      
      for (const question of questionsToCopy) {
        const { data: originalQuestion } = await supabase
          .from('questions')
          .select('*')
          .eq('id', question.id)
          .single();

        if (originalQuestion) {
          const { id, created_at, updated_at, ...questionData } = originalQuestion;
          const { error } = await supabase
            .from('questions')
            .insert({
              ...questionData,
              title: `${questionData.title} (Copy)`,
              created_by: user?.id,
            });

          if (error) throw error;
        }
      }

      toast({
        title: "Questions Copied",
        description: `Successfully copied ${selectedQuestions.size} questions`,
      });

      setSelectedQuestions(new Set());
      onQuestionsUpdated();
    } catch (error) {
      console.error('Error copying questions:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy questions",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Operations
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedQuestions.size === questions.length && questions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select All ({selectedQuestions.size} selected)
              </span>
            </div>
          </div>
        </CardHeader>
        
        {selectedQuestions.size > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={bulkCopy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoveDialog(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Move to Collection
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={bulkArchive}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQuestions(new Set())}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Questions List with Checkboxes */}
      <div className="space-y-2">
        {questions.map((question) => (
          <Card key={question.id} className="p-4">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={selectedQuestions.has(question.id)}
                onCheckedChange={() => handleSelectQuestion(question.id)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{question.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {question.question_type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {question.difficulty}
                  </Badge>
                  {question.is_active === false && (
                    <Badge variant="destructive" className="text-xs">
                      Archived
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {question.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedQuestions.size} Questions</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={bulkEditData.tags}
                onChange={(e) => setBulkEditData({ ...bulkEditData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <div>
              <Label>Difficulty</Label>
              <Select value={bulkEditData.difficulty} onValueChange={(value) => setBulkEditData({ ...bulkEditData, difficulty: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                value={bulkEditData.points}
                onChange={(e) => setBulkEditData({ ...bulkEditData, points: e.target.value })}
                placeholder="Point value"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={bulkEdit}>
                Update Questions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}