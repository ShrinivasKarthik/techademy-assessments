import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Plus, Package } from 'lucide-react';
import QuestionBank from './QuestionBank';
import BatchOperations from './BatchOperations';
import AdvancedCollections from './AdvancedCollections';
import { useQuestionBank } from '@/hooks/useQuestionBank';

const QuestionBankEnhanced = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const { questions, loading, error } = useQuestionBank();

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDifficulty = !selectedDifficulty || question.difficulty === selectedDifficulty;
    const matchesType = !selectedType || question.question_type === selectedType;
    
    return matchesSearch && matchesDifficulty && matchesType;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground">Manage your question library with advanced tools</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search questions, tags, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="coding">Coding</option>
          <option value="subjective">Subjective</option>
          <option value="file_upload">File Upload</option>
          <option value="audio">Audio</option>
        </select>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Questions ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Batch Operations
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Collections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          <QuestionBank />
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          <BatchOperations 
            questions={filteredQuestions}
            onQuestionsUpdated={() => {
              // Refetch questions after batch operations
              window.location.reload();
            }}
          />
        </TabsContent>

        <TabsContent value="collections" className="space-y-6">
          <AdvancedCollections />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestionBankEnhanced;