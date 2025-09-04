import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Grid3X3,
  List,
  Plus,
  Check
} from "lucide-react";
import { useQuestionBank, Question } from "@/hooks/useQuestionBank";
import QuestionCard from "./QuestionCard";
import QuestionPreview from "./QuestionPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuestionBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestions: (questions: Question[]) => void;
  selectedQuestionIds?: string[];
}

export default function QuestionBrowser({
  isOpen,
  onClose,
  onSelectQuestions,
  selectedQuestionIds = [],
}: QuestionBrowserProps) {
  const { questions, loading } = useQuestionBank();
  const [searchTerm, setSearchTerm] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(
    new Set(selectedQuestionIds)
  );

  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          question.title.toLowerCase().includes(searchLower) ||
          question.question_text?.toLowerCase().includes(searchLower) ||
          question.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Type filter
      if (questionTypeFilter !== 'all' && question.question_type !== questionTypeFilter) {
        return false;
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && question.difficulty !== difficultyFilter) {
        return false;
      }

      return true;
    });
  }, [questions, searchTerm, questionTypeFilter, difficultyFilter]);

  const handleToggleSelection = (question: Question) => {
    const newSelected = new Set(localSelectedIds);
    if (newSelected.has(question.id)) {
      newSelected.delete(question.id);
    } else {
      newSelected.add(question.id);
    }
    setLocalSelectedIds(newSelected);
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setShowPreview(true);
  };

  const handleSelectAll = () => {
    const allFilteredIds = new Set(filteredQuestions.map(q => q.id));
    setLocalSelectedIds(allFilteredIds);
  };

  const handleDeselectAll = () => {
    setLocalSelectedIds(new Set());
  };

  const handleAddSelected = () => {
    const selectedQuestions = questions.filter(q => localSelectedIds.has(q.id));
    onSelectQuestions(selectedQuestions);
    onClose();
  };

  const selectedCount = localSelectedIds.size;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Browse Question Bank</span>
              <Badge variant="secondary">
                {selectedCount} selected
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={questionTypeFilter} onValueChange={setQuestionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Question Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Clear
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {filteredQuestions.length} of {questions.length} questions
              </span>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className={`grid gap-4 p-2 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2 mb-3" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`grid gap-4 p-2 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {filteredQuestions.map((question) => (
                    <div key={question.id} className="relative">
                      {/* Selection overlay */}
                      {localSelectedIds.has(question.id) && (
                        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      
                      <div 
                        className={`cursor-pointer transition-all ${
                          localSelectedIds.has(question.id) 
                            ? 'ring-2 ring-primary ring-offset-2' 
                            : 'hover:ring-2 hover:ring-muted ring-offset-2'
                        }`}
                        onClick={() => handleToggleSelection(question)}
                      >
                        <QuestionCard
                          question={question}
                          onPreview={(q) => {
                            // Prevent event bubbling
                            setTimeout(() => handlePreview(q), 0);
                          }}
                          showAddButton={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && filteredQuestions.length === 0 && (
                <div className="text-center py-8">
                  <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No questions found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria
                  </p>
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedCount} question{selectedCount !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Selected ({selectedCount})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {showPreview && selectedQuestion && (
        <QuestionPreview
          question={selectedQuestion}
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setSelectedQuestion(null);
          }}
        />
      )}
    </>
  );
}