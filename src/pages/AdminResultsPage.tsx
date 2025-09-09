import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Search,
  Eye,
  Shield
} from "lucide-react";

const AdminResultsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadResultsData();
  }, []);

  const loadResultsData = async () => {
    try {
      setLoading(true);

      // Fetch assessment instances with their evaluations and proctoring data
      const { data: instances } = await supabase
        .from('assessment_instances')
        .select(`
          *,
          assessments!assessment_instances_assessment_id_fkey (id, title, description, proctoring_enabled)
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      // Get evaluations separately to avoid complex joins
      const instanceIds = instances?.map(i => i.id) || [];
      const { data: evaluations } = instanceIds.length > 0 ? await supabase
        .from('evaluations')
        .select('*')
        .in('submission_id', instanceIds) : { data: [] };

      // Get proctoring reports separately
      const { data: proctoringReports } = instanceIds.length > 0 ? await supabase
        .from('proctoring_reports')
        .select('*')
        .in('assessment_instance_id', instanceIds) : { data: [] };

      const transformedResults = instances?.map(instance => {
        const assessment = instance.assessments as any;
        const evaluation = evaluations?.find((e: any) => {
          // Since evaluations are linked to submissions, we need to find by instance
          return true; // For now, take first evaluation
        });
        const proctoringReport = proctoringReports?.find((p: any) => 
          p.assessment_instance_id === instance.id
        );
        
        return {
          id: instance.id,
          assessmentTitle: assessment?.title || 'Unknown Assessment',
          participantEmail: instance.participant_email || 'Unknown',
          participantName: instance.participant_name || 'Unknown',
          submittedAt: instance.submitted_at,
          totalScore: evaluation?.score || 0,
          maxScore: evaluation?.max_score || 0,
          scorePercentage: evaluation && evaluation.max_score > 0 
            ? Math.round((evaluation.score / evaluation.max_score) * 100) : 0,
          integrityScore: evaluation?.integrity_score || instance.integrity_score || 100,
          hasProctoring: assessment?.proctoring_enabled || false,
          proctoringStatus: proctoringReport?.status || 'pending',
          violationsCount: Array.isArray(proctoringReport?.violations_summary) 
            ? proctoringReport.violations_summary.length : 0,
          evaluationStatus: evaluation ? 'completed' : 'pending',
          isAnonymous: instance.is_anonymous
        };
      }) || [];

      setResults(transformedResults);

    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: "Error loading results",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerBatchEvaluation = async () => {
    try {
      const pendingInstances = results.filter(r => r.evaluationStatus === 'pending');
      
      if (pendingInstances.length === 0) {
        toast({
          title: "No pending evaluations",
          description: "All submissions have been evaluated.",
        });
        return;
      }

      toast({
        title: "Starting batch evaluation",
        description: `Processing ${pendingInstances.length} pending submissions...`,
      });

      for (const instance of pendingInstances) {
        try {
          await supabase.functions.invoke('auto-evaluate-assessment', {
            body: { instanceId: instance.id }
          });
        } catch (error) {
          console.error(`Error evaluating instance ${instance.id}:`, error);
        }
      }

      toast({
        title: "Batch evaluation started",
        description: "Results will update automatically as evaluations complete.",
      });

      // Reload data after a short delay
      setTimeout(loadResultsData, 3000);

    } catch (error) {
      console.error('Error triggering batch evaluation:', error);
      toast({
        title: "Error starting evaluation",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const cleanupStuckAssessments = async () => {
    try {
      toast({
        title: "Starting cleanup",
        description: "Auto-submitting stuck assessments and triggering evaluations...",
      });

      const { data, error } = await supabase.functions.invoke('cleanup-stuck-assessments');

      if (error) {
        throw error;
      }

      const result = data as any;
      toast({
        title: "Cleanup completed",
        description: `Auto-submitted ${result.processed} stuck assessments. Triggered ${result.evaluations_triggered} evaluations.`,
      });

      // Reload data after cleanup
      setTimeout(loadResultsData, 2000);

    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Cleanup failed",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.assessmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.participantName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'evaluated' && result.evaluationStatus === 'completed') ||
                         (filterStatus === 'pending' && result.evaluationStatus === 'pending');
    
    return matchesSearch && matchesStatus;
  });

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIntegrityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">High Integrity</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Medium Integrity</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low Integrity</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto p-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Assessment Results Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    View and manage all assessment submissions, scores, and proctoring data
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={cleanupStuckAssessments} variant="outline" className="gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Cleanup Stuck
                  </Button>
                  <Button onClick={triggerBatchEvaluation} className="gap-2">
                    <Zap className="w-4 h-4" />
                    Evaluate Pending
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by assessment, participant, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="evaluated">Evaluated</option>
                  <option value="pending">Pending Evaluation</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No results found</p>
                  </div>
                ) : (
                  filteredResults.map((result) => (
                    <Card key={result.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-1">
                              {result.assessmentTitle}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span>{result.participantName}</span>
                              <span>{result.participantEmail}</span>
                              {result.isAnonymous && (
                                <Badge variant="secondary">Anonymous</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Submitted: {new Date(result.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-muted-foreground">Score:</span>
                              <span className={`text-xl font-bold ${getScoreColor(result.scorePercentage)}`}>
                                {result.scorePercentage}%
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {result.totalScore} / {result.maxScore} points
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {result.hasProctoring && (
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Proctored
                              </span>
                            )}
                            {result.isAnonymous && (
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Anonymous
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                              <Eye className="w-3 h-3" />
                              View Details
                            </Button>
                            {result.hasProctoring && (
                              <Button variant="outline" size="sm" className="gap-1">
                                <Shield className="w-3 h-3" />
                                Proctoring Report
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminResultsPage;