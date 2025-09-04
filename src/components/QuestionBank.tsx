import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus, 
  Library,
  Tags,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Star,
  Trash2
} from "lucide-react";
import { useQuestionBank, Question, QuestionFilters } from "@/hooks/useQuestionBank";
import { useToast } from "@/hooks/use-toast";
import QuestionCard from "./QuestionCard";
import QuestionPreview from "./QuestionPreview";
import CreateQuestionModal from "./CreateQuestionModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AdvancedCollections from "./AdvancedCollections";
import SmartAssembly from "./SmartAssembly";
import VersionControl from "./VersionControl";
import BatchOperations from "./BatchOperations";
import SkillGapAnalysis from "./SkillGapAnalysis";
import EnhancedAIGenerator from "./EnhancedAIGenerator";

export default function QuestionBank() {
  const {
    questions,
    collections,
    loading,
    error,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createCollection,
  } = useQuestionBank();

  const { toast } = useToast();

  const [filters, setFilters] = useState<QuestionFilters>({
    search: '',
    questionType: 'all',
    difficulty: 'all',
    tags: [],
    skillIds: [],
    minRating: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          question.title.toLowerCase().includes(searchLower) ||
          question.question_text?.toLowerCase().includes(searchLower) ||
          question.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.questionType !== 'all' && question.question_type !== filters.questionType) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) {
        return false;
      }

      // Rating filter
      if (filters.minRating > 0) {
        if (!question.quality_rating || question.quality_rating < filters.minRating) {
          return false;
        }
      }

      return true;
    });
  }, [questions, filters]);

  // Separate AI-generated and manual questions for display
  const aiGeneratedQuestions = filteredQuestions.filter(q => q.created_by === null);
  const manualQuestions = filteredQuestions.filter(q => q.created_by !== null);

  const handleFilterChange = (key: keyof QuestionFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchQuestions(newFilters);
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setShowPreview(true);
  };

  const handleEdit = (question: Question) => {
    setSelectedQuestion(question);
    setShowCreateModal(true);
  };

  const handleDelete = async (question: Question) => {
    if (window.confirm(`Are you sure you want to delete "${question.title}"?`)) {
      await deleteQuestion(question.id);
    }
  };

  const handleQuestionSelect = (questionId: string, selected: boolean) => {
    setSelectedQuestions(prev => 
      selected 
        ? [...prev, questionId]
        : prev.filter(id => id !== questionId)
    );
  };

  const handleSelectAll = (checked: boolean | string) => {
    if (checked) {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedQuestions.length} question${selectedQuestions.length > 1 ? 's' : ''}?`;
    if (window.confirm(confirmMessage)) {
      try {
        // Delete questions one by one
        for (const questionId of selectedQuestions) {
          await deleteQuestion(questionId);
        }
        setSelectedQuestions([]);
        
        toast({
          title: "Questions deleted",
          description: `Successfully deleted ${selectedQuestions.length} question${selectedQuestions.length > 1 ? 's' : ''}`,
        });
      } catch (error) {
        console.error('Error deleting questions:', error);
        toast({
          title: "Error",
          description: "Failed to delete some questions",
          variant: "destructive",
        });
      }
    }
  };

  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const byType = questions.reduce((acc, q) => {
      acc[q.question_type] = (acc[q.question_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgRating = questions.length > 0 
      ? questions
          .filter(q => q.quality_rating)
          .reduce((sum, q) => sum + (q.quality_rating || 0), 0) / 
        questions.filter(q => q.quality_rating).length
      : 0;

    return { totalQuestions, byType, avgRating };
  }, [questions]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              Error loading question bank: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground">
            Advanced question management and organization
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Question
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="smart-assembly">Smart Assembly</TabsTrigger>
          <TabsTrigger value="batch-ops">Batch Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Library className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collections.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used Type</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.byType).length > 0 
                ? Object.entries(stats.byType)
                    .sort(([,a], [,b]) => b - a)[0][0].toUpperCase()
                : 'N/A'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filters.questionType} onValueChange={(value) => handleFilterChange('questionType', value)}>
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

            <Select value={filters.difficulty} onValueChange={(value) => handleFilterChange('difficulty', value)}>
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

            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="usage_count">Usage Count</SelectItem>
                <SelectItem value="quality_rating">Rating</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {filteredQuestions.length} of {questions.length} questions
            </span>
            {filters.search && (
              <Badge variant="secondary">
                Search: "{filters.search}"
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selection Controls */}
            {(aiGeneratedQuestions.length > 0 || manualQuestions.length > 0) && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">Select All</span>
                  </div>
                  {selectedQuestions.length > 0 && (
                    <Badge variant="secondary">
                      {selectedQuestions.length} selected
                    </Badge>
                  )}
                </div>
                {selectedQuestions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected ({selectedQuestions.length})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* AI Generated Questions */}
            {aiGeneratedQuestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <h3 className="text-lg font-semibold">AI Generated Questions ({aiGeneratedQuestions.length})</h3>
                </div>
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {aiGeneratedQuestions.map((question) => (
                    <div key={question.id} className="relative">
                      <Badge className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground">AI</Badge>
                      <QuestionCard
                        question={question}
                        onPreview={handlePreview}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        showActions={true}
                        showCheckbox={true}
                        isSelected={selectedQuestions.includes(question.id)}
                        onSelect={handleQuestionSelect}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Questions */}
            {manualQuestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-secondary"></div>
                  <h3 className="text-lg font-semibold">My Questions ({manualQuestions.length})</h3>
                </div>
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {manualQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onPreview={handlePreview}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      showActions={true}
                      showCheckbox={true}
                      isSelected={selectedQuestions.includes(question.id)}
                      onSelect={handleQuestionSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && filteredQuestions.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No questions found</h3>
                <p className="text-muted-foreground mb-4">
                  {questions.length === 0 
                    ? "Get started by creating your first question"
                    : "Try adjusting your search criteria"
                  }
                </p>
                {questions.length === 0 && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Question
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
        </TabsContent>

        <TabsContent value="ai-generator">
          <EnhancedAIGenerator
            onQuestionsGenerated={async () => {
              console.log('AI questions generated, refreshing list...');
              await fetchQuestions();
            }}
            assessmentContext={{
              title: "Question Bank",
              description: "AI-generated questions for the question bank",
              targetSkills: []
            }}
          />
        </TabsContent>

        <TabsContent value="collections">
          <AdvancedCollections />
        </TabsContent>

        <TabsContent value="smart-assembly">
          <SmartAssembly 
            assessmentId=""
            onQuestionsAssembled={() => {}}
          />
        </TabsContent>

        <TabsContent value="batch-ops">
          <BatchOperations 
            questions={questions}
            onQuestionsUpdated={fetchQuestions}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <SkillGapAnalysis />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showCreateModal && (
        <CreateQuestionModal
          question={selectedQuestion}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedQuestion(null);
          }}
          onSave={async (questionData) => {
            if (selectedQuestion) {
              await updateQuestion(selectedQuestion.id, questionData);
            } else {
              await createQuestion(questionData);
            }
            await fetchQuestions(); // Refresh the questions list
            setShowCreateModal(false);
            setSelectedQuestion(null);
          }}
        />
      )}

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
    </div>
  );
}