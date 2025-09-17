import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Eye, CheckCircle } from "lucide-react";
import ProjectBasedQuestionBuilder from "@/components/ProjectBasedQuestionBuilder";
import AdvancedCodingQuestionBuilder from "@/components/questions/AdvancedCodingQuestionBuilder";
import { useQuestionBank, Question } from "@/hooks/useQuestionBank";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { supabase } from "@/integrations/supabase/client";

const QuestionBuilderPage = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { questions, updateQuestion, fetchQuestions } = useQuestionBank();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({});

useEffect(() => {
    const loadQuestion = async () => {
      if (!questionId) {
        navigate('/question-bank');
        return;
      }

      try {
        setLoading(true);
        await fetchQuestions();
        let found: any = questions.find(q => q.id === questionId);

        if (!found) {
          const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single();
          if (data) found = data;
        }

        if (!found) {
          toast({
            title: "Question Not Found",
            description: "The question you're trying to edit doesn't exist.",
            variant: "destructive",
          });
          navigate('/question-bank');
          return;
        }

        setQuestion(found);
        setConfig(found.config || {});
      } catch (error) {
        toast({
          title: "Error Loading Question",
          description: "Failed to load question data.",
          variant: "destructive",
        });
        navigate('/question-bank');
      } finally {
        setLoading(false);
      }
    };

    loadQuestion();
  }, [questionId]);

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
  };

  const handleSave = async () => {
    if (!question || !questionId) return;

    try {
      await updateQuestion(questionId, { config });
      
      toast({
        title: "Question Saved",
        description: "Your question configuration has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    if (!question || !questionId) return;

    try {
      await updateQuestion(questionId, { config });
      
      toast({
        title: "Question Published",
        description: "Your question is now ready to use in assessments.",
      });
      
      navigate('/question-bank');
    } catch (error) {
      toast({
        title: "Publish Failed",
        description: "Failed to publish question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderBuilder = () => {
    if (!question) return null;

    switch (question.question_type) {
      case 'project_based':
        return (
          <ProjectBasedQuestionBuilder
            config={config}
            onConfigChange={handleConfigChange}
            questionId={questionId}
          />
        );
      case 'coding':
        return (
          <AdvancedCodingQuestionBuilder
            config={config}
            onConfigChange={handleConfigChange}
            questionDescription={(question as any).description || ''}
            difficulty={(question as any).difficulty || 'intermediate'}
          />
        );
      default:
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                This question type doesn't require advanced configuration.
              </p>
              <Button 
                onClick={() => navigate('/question-bank')} 
                className="mt-4"
              >
                Back to Question Bank
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Question not found.</p>
              <Button onClick={() => navigate('/question-bank')}>
                Back to Question Bank
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/question-bank')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Question Bank
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configure Question</h1>
              <p className="text-muted-foreground">{question.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button 
              onClick={handlePublish}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Publish Question
            </Button>
          </div>
        </div>

        {/* Builder Content */}
        <ErrorBoundary>
          {renderBuilder()}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default QuestionBuilderPage;