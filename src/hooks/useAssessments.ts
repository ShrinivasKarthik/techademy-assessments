import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  duration_minutes: number;
  max_attempts: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  instructions: string | null;
}

export interface AssessmentWithStats extends Assessment {
  question_count: number;
  participant_count: number;
  avg_score: number;
  completion_rate: number;
}

export const useAssessments = () => {
  const { user, profile } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch assessments based on user role  
      const isAdmin = profile?.role === 'admin';
      
      // Use creator_id for compatibility with current schema
      const response = await fetch(
        `https://axdwgxtukqqzupboojmx.supabase.co/rest/v1/assessments?select=*${!isAdmin ? `&creator_id=eq.${user.id}` : ''}&order=created_at.desc`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZHdneHR1a3FxenVwYm9vam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDc4MDksImV4cCI6MjA3MjUyMzgwOX0.jqTQyfetH-utIZUeSVH34ctBY70bIig65C8NZo3tMIM',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const assessmentData = response.ok ? await response.json() : [];

      // Fetch additional stats for each assessment
      const assessmentsWithStats = await Promise.all(
        assessmentData.map(async (assessment: Assessment) => {
          try {
            // Get question count
            const questionsResponse = await fetch(
              `https://axdwgxtukqqzupboojmx.supabase.co/rest/v1/questions?select=id&assessment_id=eq.${assessment.id}`,
              {
                headers: {
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZHdneHR1a3FxenVwYm9vam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDc4MDksImV4cCI6MjA3MjUyMzgwOX0.jqTQyfetH-utIZUeSVH34ctBY70bIig65C8NZo3tMIM',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const questions = questionsResponse.ok ? await questionsResponse.json() : [];

            // Get instances for participant and completion stats
            const instancesResponse = await fetch(
              `https://axdwgxtukqqzupboojmx.supabase.co/rest/v1/assessment_instances?select=id,status,total_score,max_possible_score&assessment_id=eq.${assessment.id}`,
              {
                headers: {
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZHdneHR1a3FxenVwYm9vam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDc4MDksImV4cCI6MjA3MjUyMzgwOX0.jqTQyfetH-utIZUeSVH34ctBY70bIig65C8NZo3tMIM',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const instances = instancesResponse.ok ? await instancesResponse.json() : [];

            const participant_count = instances.length;
            const completed_instances = instances.filter((i: any) => i.status === 'submitted');
            const completion_rate = participant_count > 0 ? (completed_instances.length / participant_count) * 100 : 0;
            
            const scored_instances = completed_instances.filter((i: any) => i.total_score !== null && i.max_possible_score !== null);
            const avg_score = scored_instances.length > 0 
              ? scored_instances.reduce((sum: number, i: any) => sum + (i.total_score / i.max_possible_score * 100), 0) / scored_instances.length 
              : 0;

            return {
              ...assessment,
              question_count: questions.length,
              participant_count,
              avg_score,
              completion_rate
            };
          } catch (err) {
            console.error(`Error fetching stats for assessment ${assessment.id}:`, err);
            return {
              ...assessment,
              question_count: 0,
              participant_count: 0,
              avg_score: 0,
              completion_rate: 0
            };
          }
        })
      );

      setAssessments(assessmentsWithStats);
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError('Failed to load assessments');
      toast({
        title: "Error",
        description: "Failed to load assessments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssessment = async (assessmentData: Partial<Assessment>) => {
    if (!user) throw new Error('User not authenticated');

    // Use creator_id since that's what the current schema expects
    const insertData: any = {
      ...assessmentData,
      creator_id: user.id  // Map to the existing schema field
    };
    delete insertData.user_id; // Remove user_id if it exists

    // Ensure required fields are present
    if (!insertData.title) {
      throw new Error('Title is required');
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    
    await fetchAssessments(); // Refresh the list
    return data;
  };

  const updateAssessment = async (id: string, updates: Partial<Assessment>) => {
    const { data, error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    await fetchAssessments(); // Refresh the list
    return data;
  };

  const deleteAssessment = async (id: string) => {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    await fetchAssessments(); // Refresh the list
  };

  useEffect(() => {
    if (user) {
      fetchAssessments();
    }
  }, [user, profile]);

  return {
    assessments,
    loading,
    error,
    fetchAssessments,
    createAssessment,
    updateAssessment,
    deleteAssessment
  };
};