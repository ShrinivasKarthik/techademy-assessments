import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Question {
  id: string;
  title: string;
  question_text: string | null;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  config: any;
  tags: string[];
  usage_count: number;
  quality_rating: number | null;
  difficulty_score: number | null;
  is_template: boolean;
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  skills?: { name: string }[];
}

export interface QuestionFilters {
  search: string;
  questionType: string;
  difficulty: string;
  tags: string[];
  skillIds: string[];
  minRating: number;
  sortBy: 'created_at' | 'usage_count' | 'quality_rating' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface QuestionCollection {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  created_at: string;
  question_count?: number;
}

export const useQuestionBank = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchQuestions = async (filters?: Partial<QuestionFilters>) => {
    try {
      setLoading(true);
      let query = supabase
        .from('questions')
        .select(`
          *,
          question_skills!question_skills_question_id_fkey(
            skills(name)
          )
        `)
        .is('assessment_id', null); // Only fetch standalone questions

      // If user is authenticated, fetch both AI-generated and user's own questions
      // If user is not authenticated, fetch only AI-generated questions
      if (user) {
        query = query.or(`created_by.eq.${user.id},created_by.is.null`);
      } else {
        query = query.is('created_by', null);
      }

      // Apply filters
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,question_text.ilike.%${filters.search}%`);
      }

      if (filters?.questionType && filters.questionType !== 'all') {
        query = query.eq('question_type', filters.questionType as any);
      }

      if (filters?.difficulty && filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty as any);
      }

      if (filters?.minRating) {
        query = query.gte('quality_rating', filters.minRating);
      }

      // Sort
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform the data to match our interface
      const transformedQuestions = data?.map(q => ({
        ...q,
        skills: q.question_skills?.map((qs: any) => ({ name: qs.skills.name })) || []
      })) || [];

      setQuestions(transformedQuestions);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('question_collections')
        .select(`
          *,
          collection_questions(count)
        `)
        .eq('creator_id', user.id);

      if (fetchError) throw fetchError;

      const transformedCollections = data?.map(c => ({
        ...c,
        question_count: c.collection_questions?.[0]?.count || 0
      })) || [];

      setCollections(transformedCollections);
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  const createQuestion = async (questionData: Partial<Question>) => {
    if (!user) return null;

    try {
      // Get the highest order_index for standalone questions or use 0
      const { data: maxOrder } = await supabase
        .from('questions')
        .select('order_index')
        .is('assessment_id', null)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = maxOrder && maxOrder.length > 0 ? (maxOrder[0].order_index || 0) + 1 : 0;

      const { data, error } = await supabase
        .from('questions')
        .insert({
          title: questionData.title || '',
          question_text: questionData.question_text,
          question_type: questionData.question_type || 'mcq',
          difficulty: questionData.difficulty || 'intermediate',
          points: questionData.points || 10,
          config: questionData.config || {},
          tags: questionData.tags || [],
          is_template: questionData.is_template || false,
          order_index: nextOrderIndex,
          created_by: user.id,
          assessment_id: null // Standalone question for question bank
        })
        .select()
        .single();

      if (error) throw error;

      // Handle skills mapping if provided
      if (questionData.skills && Array.isArray(questionData.skills)) {
        const skillNames = questionData.skills.map(s => typeof s === 'string' ? s : s.name);
        
        // Get or create skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('id, name')
          .in('name', skillNames);

        if (skillsError) console.error('Error fetching skills:', skillsError);

        const existingSkills = skillsData || [];
        const existingSkillNames = new Set(existingSkills.map(s => s.name));
        const newSkillNames = skillNames.filter(name => !existingSkillNames.has(name));

        // Create new skills
        let newSkills = [];
        if (newSkillNames.length > 0) {
          const { data: newSkillsData, error: createSkillsError } = await supabase
            .from('skills')
            .insert(newSkillNames.map(name => ({ name })))
            .select('id, name');

          if (createSkillsError) console.error('Error creating skills:', createSkillsError);
          newSkills = newSkillsData || [];
        }

        // Map question to skills
        const allSkills = [...existingSkills, ...newSkills];
        if (allSkills.length > 0) {
          const { error: mappingError } = await supabase
            .from('question_skills')
            .insert(allSkills.map(skill => ({
              question_id: data.id,
              skill_id: skill.id
            })));

          if (mappingError) console.error('Error mapping question to skills:', mappingError);
        }
      }

      toast({
        title: "Question created",
        description: "Question has been added to your question bank",
      });

      await fetchQuestions();
      return data;
    } catch (err) {
      console.error('Error creating question:', err);
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateQuestion = async (id: string, updates: Partial<Question>) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Question updated",
        description: "Question has been updated successfully",
      });

      await fetchQuestions();
    } catch (err) {
      console.error('Error updating question:', err);
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Question deleted",
        description: "Question has been removed from your question bank",
      });

      await fetchQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const createCollection = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('question_collections')
        .insert({
          name,
          description,
          creator_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Collection created",
        description: `Collection "${name}" has been created`,
      });

      await fetchCollections();
      return data;
    } catch (err) {
      console.error('Error creating collection:', err);
      toast({
        title: "Error",
        description: "Failed to create collection",
        variant: "destructive",
      });
      return null;
    }
  };

  const addQuestionToCollection = async (questionId: string, collectionId: string) => {
    try {
      const { error } = await supabase
        .from('collection_questions')
        .insert({
          question_id: questionId,
          collection_id: collectionId
        });

      if (error) throw error;

      toast({
        title: "Question added",
        description: "Question has been added to the collection",
      });

      await fetchCollections();
    } catch (err) {
      console.error('Error adding question to collection:', err);
      toast({
        title: "Error",
        description: "Failed to add question to collection",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Always fetch questions (AI-generated ones are visible to all users)
    fetchQuestions();
    
    // Only fetch collections if user is authenticated
    if (user) {
      fetchCollections();
    }
  }, [user]);

  return {
    questions,
    collections,
    loading,
    error,
    fetchQuestions,
    fetchCollections,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createCollection,
    addQuestionToCollection,
  };
};