import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Skill {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export const useSkills = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSkills = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('skills')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setSkills(data || []);
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setLoading(false);
    }
  };

  const createSkill = async (name: string, description?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('skills')
        .insert([{ name: name.trim(), description }])
        .select()
        .single();

      if (error) throw error;

      setSkills(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error creating skill:', err);
      throw err;
    }
  };

  const getOrCreateSkills = async (skillNames: string[]): Promise<Skill[]> => {
    if (!user || skillNames.length === 0) return [];

    try {
      const normalizedNames = skillNames.map(name => name.trim()).filter(Boolean);
      
      // First, try to find existing skills
      const { data: existingSkills, error: fetchError } = await supabase
        .from('skills')
        .select('*')
        .in('name', normalizedNames);

      if (fetchError) throw fetchError;

      const existingSkillNames = new Set(existingSkills?.map(s => s.name) || []);
      const newSkillNames = normalizedNames.filter(name => !existingSkillNames.has(name));

      // Create new skills if needed
      let newSkills: Skill[] = [];
      if (newSkillNames.length > 0) {
        const { data, error: createError } = await supabase
          .from('skills')
          .insert(newSkillNames.map(name => ({ name })))
          .select();

        if (createError) throw createError;
        newSkills = data || [];
      }

      const allSkills = [...(existingSkills || []), ...newSkills];
      
      // Update local state
      const allSkillNames = new Set(skills.map(s => s.name));
      const skillsToAdd = allSkills.filter(skill => !allSkillNames.has(skill.name));
      if (skillsToAdd.length > 0) {
        setSkills(prev => [...prev, ...skillsToAdd]);
      }

      return allSkills;
    } catch (err) {
      console.error('Error getting or creating skills:', err);
      throw err;
    }
  };

  const suggestSkillsForQuestion = async (questionText: string, questionType: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-ai-generator', {
        body: {
          type: 'auto_tag',
          questionData: {
            title: questionText.substring(0, 100),
            description: questionText,
            question_type: questionType,
            difficulty: 'intermediate'
          }
        }
      });

      if (error) throw error;

      if (data.success && data.data.skills) {
        return data.data.skills;
      }

      return [];
    } catch (err) {
      console.error('Error suggesting skills:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [user]);

  return {
    skills,
    loading,
    error,
    fetchSkills,
    createSkill,
    getOrCreateSkills,
    suggestSkillsForQuestion
  };
};