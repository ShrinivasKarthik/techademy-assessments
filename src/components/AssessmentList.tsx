import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Users, Clock, BookOpen, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AssessmentWorkflow from './AssessmentWorkflow';

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  question_count?: number;
  instance_count?: number;
}

const AssessmentList = () => {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          duration_minutes,
          status,
          created_at,
          questions(count),
          assessment_instances(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = data?.map(assessment => ({
        ...assessment,
        question_count: assessment.questions?.[0]?.count || 0,
        instance_count: assessment.assessment_instances?.[0]?.count || 0
      })) || [];

      setAssessments(processedData);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: "Error loading assessments",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const deleteAssessment = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssessments(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Assessment deleted",
        description: `"${title}" has been deleted successfully.`
      });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        title: "Error deleting assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessments</h1>
          <p className="text-muted-foreground">Manage your assessment library</p>
        </div>
        <Button asChild>
          <Link to="/assessments/create">
            <BookOpen className="w-4 h-4 mr-2" />
            Create New Assessment
          </Link>
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No assessments yet</h3>
            <p className="text-muted-foreground mb-4">Create your first assessment to get started</p>
            <Button asChild>
              <Link to="/assessments/create">Create Assessment</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <AssessmentWorkflow
              key={assessment.id}
              assessment={assessment}
              onStatusChange={fetchAssessments}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AssessmentList;