import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Code, 
  FileText, 
  Upload, 
  Mic, 
  Brain, 
  Clock, 
  Users, 
  TrendingUp,
  Play,
  Eye,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const AssessmentDashboard = () => {
  const navigate = useNavigate();
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentAssessments();
  }, []);

  const fetchRecentAssessments = async () => {
    try {
      const { data: assessments, error } = await supabase
        .from('assessments')
        .select(`
          *,
          questions (count),
          assessment_instances (count)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const processedAssessments = assessments?.map(assessment => ({
        id: assessment.id,
        title: assessment.title,
        type: 'Mixed',
        status: assessment.status,
        participants: assessment.assessment_instances?.[0]?.count || 0,
        completion: assessment.status === 'published' ? 100 : 0,
        timeLeft: assessment.status === 'draft' ? 'Draft' : assessment.status === 'published' ? 'Active' : 'Completed',
        questionCount: assessment.questions?.[0]?.count || 0
      })) || [];

      setRecentAssessments(processedAssessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const assessmentTypes = [
    {
      id: 'coding',
      title: 'Coding Assessment',
      description: 'Multi-language code editor with AI evaluation',
      icon: Code,
      color: 'primary',
      stats: { active: 12, completed: 234 }
    },
    {
      id: 'mcq',
      title: 'MCQ Assessment',
      description: 'Multiple choice with intelligent scoring',
      icon: CheckCircle,
      color: 'success',
      stats: { active: 8, completed: 156 }
    },
    {
      id: 'subjective',
      title: 'Subjective Response',
      description: 'Essay-style with semantic analysis',
      icon: FileText,
      color: 'info',
      stats: { active: 5, completed: 89 }
    },
    {
      id: 'file',
      title: 'File Upload',
      description: 'Document analysis and scoring',
      icon: Upload,
      color: 'warning',
      stats: { active: 3, completed: 67 }
    },
    {
      id: 'audio',
      title: 'Audio Response',
      description: 'Speech analysis and evaluation',
      icon: Mic,
      color: 'primary',
      stats: { active: 2, completed: 34 }
    }
  ];


  const getColorClasses = (color: string) => {
    const colors = {
      primary: 'bg-primary/10 text-primary border-primary/20',
      success: 'bg-success/10 text-success border-success/20',
      info: 'bg-info/10 text-info border-info/20',
      warning: 'bg-warning/10 text-warning border-warning/20'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default', icon: Play },
      completed: { variant: 'secondary', icon: CheckCircle },
      draft: { variant: 'outline', icon: AlertCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <section className="bg-background-secondary/50 py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Assessment Dashboard</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Manage all your assessments from one intelligent platform. Create, deploy, and analyze with AI-powered insights.
          </p>
        </div>

        {/* Assessment Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
          {assessmentTypes.map((assessment) => {
            const Icon = assessment.icon;
            return (
              <Card key={assessment.id} className="group hover:shadow-medium transition-all cursor-pointer border-primary/10">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${getColorClasses(assessment.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{assessment.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{assessment.description}</p>
                  
                  <div className="flex justify-between text-xs text-muted-foreground mb-4">
                    <span>{assessment.stats.active} Active</span>
                    <span>{assessment.stats.completed} Completed</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => navigate('/assessments/create')}
                  >
                    Create Assessment
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Assessments */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Recent Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : recentAssessments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No assessments found</p>
                <Button onClick={() => navigate('/assessments/create')}>
                  Create Your First Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAssessments.map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-background-secondary/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{assessment.title}</h4>
                      {getStatusBadge(assessment.status)}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {assessment.participants} participants
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {assessment.timeLeft}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {assessment.completion}% completion
                      </span>
                    </div>
                    {assessment.status === 'active' && (
                      <div className="mt-2">
                        <Progress value={assessment.completion} className="h-2" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/assessments/${assessment.id}/preview`)}
                      title="View Assessment"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/assessments')}
                      title="Analyze Results"
                    >
                      <Brain className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AssessmentDashboard;