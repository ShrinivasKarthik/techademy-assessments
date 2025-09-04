import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { useSimpleQuestions } from '@/hooks/useSimpleQuestions';
import { toast } from 'sonner';

const SimpleQuestionBank = () => {
  const { questions, loading, generateBulkQuestions } = useSimpleQuestions();
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [count, setCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleGenerate = async () => {
    if (skills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }

    setIsGenerating(true);
    const result = await generateBulkQuestions(skills, difficulty, count);
    
    if (result.success) {
      toast.success(`Generated ${count} questions successfully!`);
    } else {
      toast.error('Failed to generate questions');
    }
    setIsGenerating(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground">Manage your assessment questions</p>
        </div>
      </div>

      {/* AI Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Question Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Target Skills</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Python, JavaScript"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                />
                <Button type="button" onClick={addSkill} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                    {skill} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Difficulty Level</label>
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

            <div>
              <label className="text-sm font-medium">Number of Questions</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || skills.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Questions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {count} Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading questions...</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No questions yet. Generate some using AI above!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {questions.map((question) => (
                <Card key={question.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{question.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {question.question_text?.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{question.question_type}</Badge>
                        <Badge variant="outline">{question.difficulty}</Badge>
                        <Badge variant="outline">{question.points} points</Badge>
                        {question.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(question.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleQuestionBank;