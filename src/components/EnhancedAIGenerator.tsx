import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Brain, 
  Target, 
  Wand2, 
  Plus, 
  X,
  Loader2,
  Lightbulb,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Question } from "@/hooks/useQuestionBank";

interface EnhancedAIGeneratorProps {
  onQuestionsGenerated: (questions: Partial<Question>[]) => void;
  assessmentContext?: {
    title?: string;
    description?: string;
    duration_minutes?: number;
    existingQuestionsCount?: number;
    targetSkills?: string[];
  };
}

export default function EnhancedAIGenerator({ 
  onQuestionsGenerated, 
  assessmentContext 
}: EnhancedAIGeneratorProps) {
  const [activeTab, setActiveTab] = useState("bulk");
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [count, setCount] = useState(3);
  const [context, setContext] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [questionType, setQuestionType] = useState("mixed");
  const { toast } = useToast();

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleGenerate = async (type: string) => {
    if (skills.length === 0 && type !== 'recommend_questions') {
      toast({
        title: "Skills Required",
        description: "Please add at least one skill to generate questions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const requestData: any = {
        type,
        skills,
        difficulty,
        context,
        assessmentContext,
        questionType: questionType === "mixed" ? null : questionType
      };

      if (type === 'bulk_generate') {
        requestData.count = count;
      }

      const { data, error } = await supabase.functions.invoke('enhanced-ai-generator', {
        body: requestData
      });

      if (error) throw error;

      if (data.success) {
        if (type === 'recommend_questions') {
          setRecommendations(data.data);
          toast({
            title: "Recommendations Generated",
            description: `Found ${data.data.length} recommended questions`,
          });
        } else {
          onQuestionsGenerated(data.data);
          toast({
            title: "Questions Generated",
            description: `Successfully generated ${Array.isArray(data.data) ? data.data.length : 1} question(s)`,
          });
        }
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addRecommendedQuestion = (recommendation: any) => {
    if (recommendation.question) {
      onQuestionsGenerated([{
        title: recommendation.question.title,
        question_text: recommendation.question.question_text,
        question_type: recommendation.question.question_type,
        difficulty: recommendation.question.difficulty,
        points: recommendation.question.points,
        config: recommendation.question.config,
        tags: recommendation.question.tags || [],
      }]);
      
      toast({
        title: "Question Added",
        description: `Added "${recommendation.question.title}" to your assessment`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Enhanced AI Question Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Bulk Generate
            </TabsTrigger>
            <TabsTrigger value="targeted" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Skill-Targeted
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          {/* Common Skills Input */}
          {activeTab !== 'recommendations' && (
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Target Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill (e.g., JavaScript, Problem Solving)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addSkill}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer">
                      {skill}
                      <X
                        className="ml-1 h-3 w-3"
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
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

                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed Types</SelectItem>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="subjective">Subjective</SelectItem>
                      <SelectItem value="file_upload">File Upload</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeTab === 'bulk' && (
                  <div className="space-y-2">
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Context & Instructions</Label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Provide additional context, specific requirements, or focus areas for the questions..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <TabsContent value="bulk" className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Bulk Generation</h4>
              <p className="text-sm text-muted-foreground">
                Generate multiple diverse questions at once, covering all the specified skills with different question types and approaches.
              </p>
            </div>
            <Button 
              onClick={() => handleGenerate('bulk_generate')} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating {count} Questions...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate {count} Questions
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="targeted" className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Skill-Targeted Generation</h4>
              <p className="text-sm text-muted-foreground">
                Create a single, highly focused question that specifically tests the selected skills with precision and depth.
              </p>
            </div>
            <Button 
              onClick={() => handleGenerate('skill_targeted')} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Targeted Question...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Generate Targeted Question
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Smart Recommendations</h4>
              <p className="text-sm text-muted-foreground">
                Get AI-powered suggestions for existing questions that best fit your assessment context and objectives.
              </p>
            </div>

            <Button 
              onClick={() => handleGenerate('recommend_questions')} 
              disabled={loading || !assessmentContext}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing & Recommending...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Get Smart Recommendations
                </>
              )}
            </Button>

            {recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Recommended Questions:</h4>
                {recommendations.map((rec, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium">{rec.question?.title}</h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.question?.question_type} • {rec.question?.difficulty} • {rec.question?.points} pts
                        </p>
                        <p className="text-sm mb-2">{rec.reasoning}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Relevance: {(rec.relevance_score * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant="secondary">
                            Used {rec.question?.usage_count || 0} times
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addRecommendedQuestion(rec)}
                      >
                        Add Question
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}