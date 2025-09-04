import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Star,
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye,
  Flag,
  Search,
  Filter,
  TrendingDown
} from "lucide-react";
import { useQuestionBank, Question } from "@/hooks/useQuestionBank";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QualityIssue {
  type: 'duplicate' | 'low_rating' | 'unused' | 'incomplete';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export default function QuestionQualityManager() {
  const { questions, loading, updateQuestion, deleteQuestion } = useQuestionBank();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityIssues, setQualityIssues] = useState<Map<string, QualityIssue[]>>(new Map());
  const { toast } = useToast();

  // Analyze questions for quality issues
  useEffect(() => {
    if (!questions.length) return;

    const issues = new Map<string, QualityIssue[]>();

    questions.forEach(question => {
      const questionIssues: QualityIssue[] = [];

      // Check for low ratings
      if (question.quality_rating && question.quality_rating < 3) {
        questionIssues.push({
          type: 'low_rating',
          severity: question.quality_rating < 2 ? 'high' : 'medium',
          description: `Low quality rating: ${question.quality_rating.toFixed(1)}/5`,
          suggestion: 'Consider reviewing and improving the question content'
        });
      }

      // Check for unused questions
      if (question.usage_count === 0) {
        questionIssues.push({
          type: 'unused',
          severity: 'low',
          description: 'Question has never been used',
          suggestion: 'Promote this question or consider archiving if not relevant'
        });
      }

      // Check for incomplete content
      if (!question.question_text || question.question_text.trim().length < 10) {
        questionIssues.push({
          type: 'incomplete',
          severity: 'medium',
          description: 'Missing or insufficient question text',
          suggestion: 'Add detailed question text to improve clarity'
        });
      }

      if (!question.tags || question.tags.length === 0) {
        questionIssues.push({
          type: 'incomplete',
          severity: 'low',
          description: 'No tags assigned',
          suggestion: 'Add relevant tags to improve searchability'
        });
      }

      // Check for potential duplicates (simple title similarity)
      const similarQuestions = questions.filter(other => 
        other.id !== question.id && 
        other.title.toLowerCase().includes(question.title.toLowerCase().substring(0, 20)) ||
        question.title.toLowerCase().includes(other.title.toLowerCase().substring(0, 20))
      );

      if (similarQuestions.length > 0) {
        questionIssues.push({
          type: 'duplicate',
          severity: 'medium',
          description: `Potential duplicate of ${similarQuestions.length} other question(s)`,
          suggestion: 'Review for similarity and consider merging or differentiating'
        });
      }

      if (questionIssues.length > 0) {
        issues.set(question.id, questionIssues);
      }
    });

    setQualityIssues(issues);
  }, [questions]);

  const filteredQuestions = questions.filter(question => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        question.title.toLowerCase().includes(searchLower) ||
        question.question_text?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Quality filter
    if (filterType === 'issues') {
      return qualityIssues.has(question.id);
    } else if (filterType === 'low_rating') {
      return question.quality_rating && question.quality_rating < 3;
    } else if (filterType === 'unused') {
      return question.usage_count === 0;
    } else if (filterType === 'unrated') {
      return !question.quality_rating;
    }

    return true;
  });

  const handleRateQuestion = async (questionId: string, newRating: number, newFeedback: string) => {
    try {
      await updateQuestion(questionId, {
        quality_rating: newRating,
        // Store feedback in a metadata field if needed
      });

      toast({
        title: "Question Rated",
        description: `Rating updated to ${newRating}/5 stars`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update question rating",
        variant: "destructive",
      });
    }
  };

  const handleAutoTag = async (question: Question) => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-ai-generator', {
        body: {
          type: 'auto_tag',
          questionData: question
        }
      });

      if (error) throw error;

      if (data.success) {
        const { skills, tags } = data.data;
        
        await updateQuestion(question.id, {
          tags: [...(question.tags || []), ...tags].filter((tag, index, arr) => arr.indexOf(tag) === index)
        });

        toast({
          title: "Auto-tagging Complete",
          description: `Added ${tags.length} tags: ${tags.join(', ')}`,
        });
      }
    } catch (error) {
      toast({
        title: "Auto-tagging Failed",
        description: "Could not generate tags for this question",
        variant: "destructive",
      });
    }
  };

  const getIssueIcon = (type: QualityIssue['type']) => {
    switch (type) {
      case 'duplicate': return <Copy className="h-4 w-4" />;
      case 'low_rating': return <Star className="h-4 w-4" />;
      case 'unused': return <TrendingDown className="h-4 w-4" />;
      case 'incomplete': return <AlertTriangle className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: QualityIssue['severity']) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-muted-foreground';
    }
  };

  const questionsWithIssues = questions.filter(q => qualityIssues.has(q.id)).length;
  const avgRating = questions
    .filter(q => q.quality_rating)
    .reduce((sum, q) => sum + (q.quality_rating || 0), 0) / 
    questions.filter(q => q.quality_rating).length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Quality Manager</h1>
          <p className="text-muted-foreground">
            Monitor and improve the quality of your question bank
          </p>
        </div>
      </div>

      {/* Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions with Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{questionsWithIssues}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 5 stars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrated Questions</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {questions.filter(q => !q.quality_rating).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused Questions</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {questions.filter(q => q.usage_count === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Never used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Quality Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                <SelectItem value="issues">Questions with Issues</SelectItem>
                <SelectItem value="low_rating">Low Rating (&lt; 3 stars)</SelectItem>
                <SelectItem value="unused">Unused Questions</SelectItem>
                <SelectItem value="unrated">Unrated Questions</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              Showing {filteredQuestions.length} of {questions.length} questions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((question) => {
          const issues = qualityIssues.get(question.id) || [];
          
          return (
            <Card key={question.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium mb-2">{question.title}</h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{question.question_type}</Badge>
                          <Badge variant="outline">{question.difficulty}</Badge>
                          <Badge variant="secondary">{question.points} pts</Badge>
                          <Badge variant="outline">Used {question.usage_count} times</Badge>
                          
                          {question.quality_rating && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              {question.quality_rating.toFixed(1)}
                            </Badge>
                          )}
                        </div>

                        {issues.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {issues.map((issue, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <span className={getSeverityColor(issue.severity)}>
                                  {getIssueIcon(issue.type)}
                                </span>
                                <span className="text-muted-foreground">
                                  {issue.description} - {issue.suggestion}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {question.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(!question.tags || question.tags.length === 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoTag(question)}
                      >
                        Auto-tag
                      </Button>
                    )}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Star className="h-4 w-4 mr-2" />
                          Rate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rate Question: {question.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Quality Rating</Label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Button
                                  key={star}
                                  variant={rating >= star ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setRating(star)}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Feedback (optional)</Label>
                            <Textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Provide feedback on question quality..."
                              rows={3}
                            />
                          </div>

                          <Button 
                              onClick={() => {
                                handleRateQuestion(question.id, rating, feedback);
                                setFeedback('');
                                setRating(5);
                              }}
                            className="w-full"
                          >
                            Submit Rating
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredQuestions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-medium mb-2">All Good!</h3>
              <p className="text-muted-foreground">
                {filterType === 'all' 
                  ? "No questions found matching your search"
                  : "No quality issues found in the selected category"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}