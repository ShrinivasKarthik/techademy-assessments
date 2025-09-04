import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wand2, BookOpen, FileText, HelpCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeneratedContent {
  title: string;
  description: string;
  difficulty: string;
  points: number;
  config: any;
}

interface AIContentGeneratorProps {
  questionType: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  onContentGenerated: (content: GeneratedContent) => void;
}

const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
  questionType,
  onContentGenerated
}) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateContent = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic to generate content.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate AI content generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const templates = getTemplatesByType(questionType, topic, difficulty, context);
      const template = templates[Math.floor(Math.random() * templates.length)];

      onContentGenerated(template);

      toast({
        title: "Content Generated",
        description: `Generated ${questionType} question about ${topic}`,
      });

      // Reset form
      setTopic('');
      setContext('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getTemplatesByType = (type: string, topic: string, difficulty: string, context: string): GeneratedContent[] => {
    const basePoints = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20;

    switch (type) {
      case 'coding':
        return [
          {
            title: `${topic} Implementation Challenge`,
            description: `Write a function to solve a ${topic.toLowerCase()} problem. ${context ? `Context: ${context}` : ''}`,
            difficulty: difficulty || 'medium',
            points: basePoints,
            config: {
              language: 'javascript',
              starterCode: `function solve${topic.replace(/\s+/g, '')}() {\n  // Your code here\n}`,
              expectedOutput: 'Implement the solution',
              testCases: [
                { input: 'test input', expectedOutput: 'expected output' }
              ]
            }
          }
        ];

      case 'mcq':
        return [
          {
            title: `${topic} Knowledge Check`,
            description: `Multiple choice question about ${topic.toLowerCase()}. ${context ? `Context: ${context}` : ''}`,
            difficulty: difficulty || 'easy',
            points: basePoints,
            config: {
              options: [
                { id: '1', text: `Correct answer about ${topic}`, isCorrect: true },
                { id: '2', text: `Incorrect option 1`, isCorrect: false },
                { id: '3', text: `Incorrect option 2`, isCorrect: false },
                { id: '4', text: `Incorrect option 3`, isCorrect: false }
              ],
              allowMultiple: false,
              shuffleOptions: true
            }
          }
        ];

      case 'subjective':
        return [
          {
            title: `${topic} Essay Question`,
            description: `Write a detailed response about ${topic.toLowerCase()}. ${context ? `Context: ${context}` : ''}`,
            difficulty: difficulty || 'medium',
            points: basePoints,
            config: {
              minWords: 100,
              maxWords: 500,
              placeholder: `Explain your understanding of ${topic}...`,
              rubric: [
                { criteria: 'Understanding', description: `Demonstrates clear understanding of ${topic}`, points: 5 },
                { criteria: 'Analysis', description: 'Provides thoughtful analysis', points: 5 },
                { criteria: 'Examples', description: 'Uses relevant examples', points: 5 }
              ]
            }
          }
        ];

      case 'file_upload':
        return [
          {
            title: `${topic} Project Submission`,
            description: `Upload your ${topic.toLowerCase()} project files. ${context ? `Context: ${context}` : ''}`,
            difficulty: difficulty || 'medium',
            points: basePoints,
            config: {
              allowedTypes: ['pdf', 'doc', 'docx', 'zip'],
              maxSizeBytes: 10 * 1024 * 1024,
              maxFiles: 3,
              instructions: `Please upload your ${topic} project files.`
            }
          }
        ];

      case 'audio':
        return [
          {
            title: `${topic} Audio Response`,
            description: `Record an audio response about ${topic.toLowerCase()}. ${context ? `Context: ${context}` : ''}`,
            difficulty: difficulty || 'medium',
            points: basePoints,
            config: {
              maxDurationSeconds: 300,
              allowRerecording: true,
              instructions: `Please record your thoughts about ${topic}. Speak clearly and concisely.`
            }
          }
        ];

      default:
        return [];
    }
  };

  const getQuestionTypeIcon = () => {
    switch (questionType) {
      case 'coding':
        return <FileText className="h-4 w-4" />;
      case 'mcq':
        return <HelpCircle className="h-4 w-4" />;
      case 'subjective':
        return <BookOpen className="h-4 w-4" />;
      case 'file_upload':
        return <Upload className="h-4 w-4" />;
      case 'audio':
        return <Wand2 className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Content Generator
          <Badge variant="secondary" className="ml-2">
            {getQuestionTypeIcon()}
            {questionType.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            placeholder="e.g., React Hooks, Data Structures, Machine Learning"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (Optional)</Label>
          <Textarea
            id="context"
            placeholder="Provide any specific requirements, focus areas, or context for the question..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={generateContent} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Wand2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Question
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIContentGenerator;