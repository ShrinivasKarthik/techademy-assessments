import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot,
  Target,
  Zap,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Trophy,
  TrendingUp,
  Brain,
  Loader2,
  Wand2,
  Plus,
  X,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SmartAssemblyProps {
  assessmentId: string;
  assessmentTitle?: string;
  onQuestionsAssembled: (questions: any[]) => void;
}

interface AssemblyMetrics {
  totalQuestions: number;
  totalPoints: number;
  skillsCovered: string[];
  difficultyBreakdown: { [key: string]: number };
  estimatedTime: number;
}

export default function SmartAssembly({ 
  assessmentId, 
  assessmentTitle = "Assessment",
  onQuestionsAssembled 
}: SmartAssemblyProps) {
  const [loading, setLoading] = useState(false);
  const [targetSkills, setTargetSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [metrics, setMetrics] = useState<AssemblyMetrics | null>(null);
  
  const [assemblyConfig, setAssemblyConfig] = useState({
    totalPoints: 100,
    timeLimitMinutes: 60,
    difficultyDistribution: {
      beginner: 20,
      intermediate: 60,
      advanced: 20,
    },
    questionTypes: ['coding', 'mcq', 'subjective'],
    prioritizeQuality: true,
    ensureVariety: true,
    aiCriteria: '',
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const addSkill = () => {
    if (newSkill.trim() && !targetSkills.includes(newSkill.trim())) {
      setTargetSkills([...targetSkills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setTargetSkills(targetSkills.filter(skill => skill !== skillToRemove));
  };

  const handleDifficultyChange = (level: string, value: number[]) => {
    const newDistribution = { ...assemblyConfig.difficultyDistribution };
    newDistribution[level as keyof typeof newDistribution] = value[0];
    
    // Ensure total stays at 100%
    const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      // Adjust other values proportionally
      const otherLevels = Object.keys(newDistribution).filter(k => k !== level);
      const adjustment = (100 - value[0]) / (total - value[0]);
      
      otherLevels.forEach(otherLevel => {
        newDistribution[otherLevel as keyof typeof newDistribution] = 
          Math.round(newDistribution[otherLevel as keyof typeof newDistribution] * adjustment);
      });
    }
    
    setAssemblyConfig(prev => ({
      ...prev,
      difficultyDistribution: newDistribution
    }));
  };

  const handleSmartAssembly = async () => {
    if (targetSkills.length === 0) {
      toast({
        title: "Skills Required",
        description: "Please add at least one target skill for the assessment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-assembly', {
        body: {
          assessmentId,
          targetSkills,
          difficultyDistribution: assemblyConfig.difficultyDistribution,
          questionTypes: assemblyConfig.questionTypes,
          totalPoints: assemblyConfig.totalPoints,
          timeLimitMinutes: assemblyConfig.timeLimitMinutes,
          aiCriteria: assemblyConfig.aiCriteria,
          preferences: {
            prioritizeQuality: assemblyConfig.prioritizeQuality,
            ensureVariety: assemblyConfig.ensureVariety,
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setMetrics(data.metrics);
        onQuestionsAssembled(data.selectedQuestions);
        
        toast({
          title: "Assessment Assembled",
          description: `Successfully assembled ${data.selectedQuestions.length} questions using AI optimization`,
        });
      } else {
        throw new Error(data.error || 'Assembly failed');
      }
    } catch (error) {
      console.error('Smart assembly error:', error);
      toast({
        title: "Assembly Failed",
        description: error instanceof Error ? error.message : "Failed to assemble questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Smart Assessment Assembly
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Let AI intelligently select and optimize questions for "{assessmentTitle}"
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            {/* Target Skills */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Target Skills</Label>
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
                {targetSkills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer">
                    {skill}
                    <X
                      className="ml-1 h-3 w-3"
                      onClick={() => removeSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
              {targetSkills.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add skills that this assessment should test
                </p>
              )}
            </div>

            {/* Assessment Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Points Target</Label>
                <Input
                  type="number"
                  value={assemblyConfig.totalPoints}
                  onChange={(e) => setAssemblyConfig(prev => ({
                    ...prev,
                    totalPoints: parseInt(e.target.value) || 100
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  value={assemblyConfig.timeLimitMinutes}
                  onChange={(e) => setAssemblyConfig(prev => ({
                    ...prev,
                    timeLimitMinutes: parseInt(e.target.value) || 60
                  }))}
                />
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Difficulty Distribution</Label>
              
              <div className="space-y-4">
                {Object.entries(assemblyConfig.difficultyDistribution).map(([level, value]) => (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{level}</Label>
                      <Badge variant="outline">{value}%</Badge>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(newValue) => handleDifficultyChange(level, newValue)}
                      max={80}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Question Types</Label>
              <div className="flex flex-wrap gap-2">
                {['coding', 'mcq', 'subjective', 'file_upload', 'audio'].map(type => (
                  <Badge
                    key={type}
                    variant={assemblyConfig.questionTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newTypes = assemblyConfig.questionTypes.includes(type)
                        ? assemblyConfig.questionTypes.filter(t => t !== type)
                        : [...assemblyConfig.questionTypes, type];
                      
                      setAssemblyConfig(prev => ({ ...prev, questionTypes: newTypes }));
                    }}
                  >
                    {type.replace('_', ' ').toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>

            {/* AI Optimization Preferences */}
            <div className="space-y-4">
              <Label className="text-base font-medium">AI Optimization</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="prioritize-quality">Prioritize Question Quality</Label>
                    <p className="text-sm text-muted-foreground">
                      Favor higher-rated and well-tested questions
                    </p>
                  </div>
                  <Switch
                    id="prioritize-quality"
                    checked={assemblyConfig.prioritizeQuality}
                    onCheckedChange={(checked) => setAssemblyConfig(prev => ({
                      ...prev,
                      prioritizeQuality: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ensure-variety">Ensure Question Variety</Label>
                    <p className="text-sm text-muted-foreground">
                      Maximize diversity in question formats and approaches
                    </p>
                  </div>
                  <Switch
                    id="ensure-variety"
                    checked={assemblyConfig.ensureVariety}
                    onCheckedChange={(checked) => setAssemblyConfig(prev => ({
                      ...prev,
                      ensureVariety: checked
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional AI Criteria</Label>
                <Textarea
                  value={assemblyConfig.aiCriteria}
                  onChange={(e) => setAssemblyConfig(prev => ({
                    ...prev,
                    aiCriteria: e.target.value
                  }))}
                  placeholder="Provide specific instructions for question selection (e.g., 'Focus on practical applications', 'Include algorithm challenges', etc.)"
                  rows={3}
                />
              </div>
            </div>

            {/* Assembly Button */}
            <Button 
              onClick={handleSmartAssembly} 
              disabled={loading || targetSkills.length === 0}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  AI is Assembling Assessment...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Assemble Assessment with AI
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {metrics ? (
              <>
                {/* Assembly Success */}
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      Assessment Successfully Assembled
                    </h4>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      AI has optimized question selection based on your criteria
                    </p>
                  </div>
                </div>

                {/* Metrics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{metrics.totalQuestions}</div>
                      <div className="text-sm text-muted-foreground">Questions</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      <div className="text-2xl font-bold">{metrics.totalPoints}</div>
                      <div className="text-sm text-muted-foreground">Total Points</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{metrics.estimatedTime}</div>
                      <div className="text-sm text-muted-foreground">Est. Minutes</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">{metrics.skillsCovered.length}</div>
                      <div className="text-sm text-muted-foreground">Skills Covered</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Skills Coverage */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Skills Covered</Label>
                  <div className="flex flex-wrap gap-2">
                    {metrics.skillsCovered.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Difficulty Breakdown */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Difficulty Breakdown
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(metrics.difficultyBreakdown).map(([level, count]) => (
                      <Card key={level}>
                        <CardContent className="p-3 text-center">
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-sm text-muted-foreground capitalize">{level}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Ready for AI Assembly</h3>
                <p className="text-muted-foreground">
                  Configure your preferences and run the AI assembly to see results here
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}