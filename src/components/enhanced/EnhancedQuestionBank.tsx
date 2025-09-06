import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useDebounce, useMemoizedFilter, usePagination } from '@/hooks/usePerformanceOptimization';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { QuestionBankLoading } from './LoadingStates';
import { ErrorMessage } from '@/components/ui/error-boundary';
import { Search, Filter, Plus } from 'lucide-react';

interface EnhancedQuestionBankProps {
  onQuestionSelect?: (questionId: string) => void;
  mode?: 'view' | 'select' | 'manage';
}

export const EnhancedQuestionBank: React.FC<EnhancedQuestionBankProps> = ({
  onQuestionSelect,
  mode = 'view'
}) => {
  const { questions, loading: isLoading, fetchQuestions } = useQuestionBank();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const debouncedSearch = useDebounce((query: string) => {
    setSearchQuery(query);
  }, 300);

  const filteredQuestions = useMemoizedFilter(
    questions,
    (question, query) => {
      const matchesSearch = question.title.toLowerCase().includes(query);
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.every(tag => question.tags?.includes(tag));
      return matchesSearch && matchesTags;
    },
    searchQuery
  );

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev
  } = usePagination(filteredQuestions, 10);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        await fetchQuestions();
      } catch (err) {
        handleError(err, 'loading questions');
      }
    };
    loadQuestions();
  }, [fetchQuestions, handleError]);

  if (isLoading) {
    return <QuestionBankLoading />;
  }

  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        retry={() => retry(fetchQuestions)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Enhanced Question Bank
          </CardTitle>
          <CardDescription>
            Search, filter, and manage your question library with advanced features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search questions..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            {mode === 'manage' && (
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {paginatedData.map((question) => (
          <Card 
            key={question.id} 
            className="transition-smooth hover:shadow-medium cursor-pointer"
            onClick={() => onQuestionSelect?.(question.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">{question.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    Question Type: {question.question_type}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {question.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      {question.question_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {question.points} points
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={prevPage}
            disabled={!hasPrev}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={nextPage}
            disabled={!hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};