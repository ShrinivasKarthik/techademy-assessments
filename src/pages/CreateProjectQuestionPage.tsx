import Navigation from "@/components/Navigation";
import ProjectBasedQuestionBuilder from "@/components/ProjectBasedQuestionBuilder";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Layers3, 
  Sparkles, 
  Code2, 
  FolderTree, 
  Zap,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen
} from "lucide-react";

const CreateProjectQuestionPage = () => {
  const { createQuestion, updateQuestion } = useQuestionBank();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [questionTitle, setQuestionTitle] = useState('');
  const [config, setConfig] = useState({
    technology: '',
    problemDescription: '',
    projectFiles: [],
    testScenarios: [],
    evaluationCriteria: [],
    estimatedDuration: 60,
    allowedResources: []
  });

  const handleConfigChange = async (newConfig: any) => {
    setConfig(newConfig);
    
    // Auto-save when there's meaningful content
    if (questionTitle.trim() && newConfig.technology && newConfig.problemDescription) {
      await handleSave(newConfig);
    }
  };

  const handleSave = async (configToSave = config) => {
    try {
      if (!questionTitle.trim() || !configToSave.technology.trim() || !configToSave.problemDescription.trim()) {
        toast({
          title: "Missing Information",
          description: "Please fill in question title, technology and problem description before saving.",
          variant: "destructive",
        });
        return;
      }

      const questionData = {
        title: questionTitle,
        question_text: configToSave.problemDescription,
        question_type: 'project_based' as const,
        difficulty: 'intermediate' as const,
        points: 50,
        config: configToSave,
        tags: [configToSave.technology.toLowerCase().replace(/\s+/g, '-')],
        skills: [{ name: configToSave.technology }],
        is_template: false,
      };

      if (currentQuestionId) {
        await updateQuestion(currentQuestionId, questionData);
        toast({
          title: "Project Question Updated",
          description: "Your project-based question has been updated successfully.",
        });
      } else {
        const newQuestion = await createQuestion(questionData);
        if (newQuestion) {
          setCurrentQuestionId(newQuestion.id);
          toast({
            title: "Project Question Created",
            description: "Your project-based question has been created and saved to the question bank. You can now use it in any assessment.",
          });
        }
      }
    } catch (error) {
      console.error('Error saving project question:', error);
      toast({
        title: "Save Failed",
        description: "Could not save project question. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6 space-y-8">
        {/* Back Navigation */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/question-bank')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Question Bank
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>Questions created here will be saved to your question bank</span>
          </div>
        </div>
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <Badge variant="secondary" className="text-sm font-medium">
            ✨ Enhanced Universal Technology Question Framework
          </Badge>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Create Project-Based Question
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Create realistic, multi-file project questions for any technology stack. 
            Add them to your question bank for use in any assessment.
          </p>
        </div>



        {/* Main Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-6 h-6" />
              Create Project-Based Question
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline">Any Technology</Badge>
            </CardTitle>
            <CardDescription>
              Build comprehensive project questions with unlimited technology support and AI-powered assistance.
              This question will be saved to your question bank for use in any assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Question Title Field */}
              <div className="space-y-2">
                <Label htmlFor="question-title" className="text-sm font-medium">
                  Question Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="question-title"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  placeholder="Enter a descriptive title for your project-based question"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  This title will appear in your question bank and assessments
                </p>
              </div>
              
              <Separator />
              
              <ErrorBoundary>
                <ProjectBasedQuestionBuilder
                  config={config}
                  onConfigChange={handleConfigChange}
                  questionId={currentQuestionId || undefined}
                  onAutoSave={async () => await handleSave()}
                />
              </ErrorBoundary>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateProjectQuestionPage;