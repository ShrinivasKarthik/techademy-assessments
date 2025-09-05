import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Users, 
  BookOpen, 
  Play, 
  ArrowLeft, 
  Share, 
  Copy, 
  Eye, 
  Settings,
  Calendar,
  UserPlus,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: string;
  title: string;
  question_text: string;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  difficulty: string;
  points: number;
  order_index: number;
  config: any;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  duration_minutes: number;
  max_attempts: number;
  status: 'draft' | 'published' | 'archived';
  questions: Question[];
}

interface AssessmentPreviewProps {
  assessmentId: string;
}

const AssessmentPreview: React.FC<AssessmentPreviewProps> = ({ assessmentId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [existingShares, setExistingShares] = useState<any[]>([]);
  
  // Share configuration
  const [shareConfig, setShareConfig] = useState({
    expiresIn: 7, // days
    maxAttempts: null as number | null,
    requireName: false,
    requireEmail: false,
    allowAnonymous: true,
  });

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          instructions,
          duration_minutes,
          max_attempts,
          status,
          questions!fk_questions_assessment(
            id,
            title,
            question_text,
            question_type,
            difficulty,
            points,
            order_index,
            config
          )
        `)
        .eq('id', assessmentId)
        .single();

      if (error) throw error;

      const sortedQuestions = data.questions.sort((a, b) => a.order_index - b.order_index);
      setAssessment({ ...data, questions: sortedQuestions });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      toast({
        title: "Error loading assessment",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels = {
      'coding': 'Coding Challenge',
      'mcq': 'Multiple Choice',
      'subjective': 'Subjective',
      'file_upload': 'File Upload',
      'audio': 'Audio Response'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const startAssessment = () => {
    navigate(`/assessments/${assessmentId}/take`);
  };

  // Fetch existing shares when dialog opens
  const fetchExistingShares = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_shares')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingShares(data || []);
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  // Create a new share link
  const createShareLink = async () => {
    if (!assessment) return;

    try {
      setShareLoading(true);

      const { data, error } = await supabase.functions.invoke('share-assessment', {
        body: {
          assessmentId: assessment.id,
          expiresIn: shareConfig.expiresIn,
          maxAttempts: shareConfig.maxAttempts,
          requireName: shareConfig.requireName,
          requireEmail: shareConfig.requireEmail,
          allowAnonymous: shareConfig.allowAnonymous,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setShareLink(data.shareLink);
      await fetchExistingShares(); // Refresh the list

      toast({
        title: "Share Link Created!",
        description: "Your assessment share link has been generated successfully.",
      });

    } catch (error: any) {
      console.error('Error creating share link:', error);
      toast({
        title: "Error Creating Share Link",
        description: error.message || "Failed to create share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShareLoading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  // Deactivate a share
  const deactivateShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_shares')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) throw error;

      await fetchExistingShares();
      toast({
        title: "Share Deactivated",
        description: "The share link has been deactivated.",
      });
    } catch (error) {
      console.error('Error deactivating share:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate share link.",
        variant: "destructive",
      });
    }
  };

  // Handle share dialog open
  const handleShareDialogOpen = (open: boolean) => {
    setShareDialogOpen(open);
    if (open) {
      fetchExistingShares();
      setShareLink(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center p-12">
            <h3 className="text-lg font-medium mb-2">Assessment not found</h3>
            <p className="text-muted-foreground mb-4">This assessment may have been removed or you may not have access to it.</p>
            <Button onClick={() => navigate('/assessments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questionPercentage = assessment.questions.length > 0 ? Math.round(100 / assessment.questions.length) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/assessments')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Assessments
        </Button>
        
        <div className="flex gap-2">
          <Dialog open={shareDialogOpen} onOpenChange={handleShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  Share Assessment
                </DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="create" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">Create New Link</TabsTrigger>
                  <TabsTrigger value="manage">Manage Links</TabsTrigger>
                </TabsList>
                
                {/* Create New Share Link */}
                <TabsContent value="create" className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expires">Expires In (Days)</Label>
                        <Input
                          id="expires"
                          type="number"
                          min="1"
                          max="365"
                          value={shareConfig.expiresIn}
                          onChange={(e) => setShareConfig(prev => ({ 
                            ...prev, 
                            expiresIn: parseInt(e.target.value) || 7 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxAttempts">Max Attempts (Optional)</Label>
                        <Input
                          id="maxAttempts"
                          type="number"
                          min="1"
                          placeholder="Unlimited"
                          value={shareConfig.maxAttempts || ''}
                          onChange={(e) => setShareConfig(prev => ({ 
                            ...prev, 
                            maxAttempts: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Participant Requirements</h4>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Require Name</Label>
                          <p className="text-sm text-muted-foreground">
                            Participants must enter their name before starting
                          </p>
                        </div>
                        <Switch
                          checked={shareConfig.requireName}
                          onCheckedChange={(checked) => setShareConfig(prev => ({ 
                            ...prev, 
                            requireName: checked 
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Require Email</Label>
                          <p className="text-sm text-muted-foreground">
                            Participants must enter their email before starting
                          </p>
                        </div>
                        <Switch
                          checked={shareConfig.requireEmail}
                          onCheckedChange={(checked) => setShareConfig(prev => ({ 
                            ...prev, 
                            requireEmail: checked 
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Allow Anonymous</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow participants to take assessment without registration
                          </p>
                        </div>
                        <Switch
                          checked={shareConfig.allowAnonymous}
                          onCheckedChange={(checked) => setShareConfig(prev => ({ 
                            ...prev, 
                            allowAnonymous: checked 
                          }))}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Button 
                        onClick={createShareLink}
                        disabled={shareLoading}
                        className="w-full"
                        size="lg"
                      >
                        {shareLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Link...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Create Share Link
                          </>
                        )}
                      </Button>

                      {shareLink && (
                        <Alert className="bg-green-50 border-green-200 animate-fade-in">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="space-y-3">
                            <div>
                              <p className="font-medium text-green-800 mb-2">Share link created successfully!</p>
                              <div className="flex items-center gap-2">
                                <Input 
                                  value={shareLink} 
                                  readOnly 
                                  className="font-mono text-sm"
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => copyToClipboard(shareLink)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Button 
                                variant="link" 
                                size="sm"
                                onClick={() => window.open(shareLink, '_blank')}
                                className="p-0 h-auto text-green-700 hover:text-green-800"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Preview Link
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Manage Existing Links */}
                <TabsContent value="manage" className="space-y-4">
                  {existingShares.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No active share links found.</p>
                      <p className="text-sm">Create your first share link to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {existingShares.map((share) => (
                        <Card key={share.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {share.access_count} access{share.access_count !== 1 ? 'es' : ''}
                                  </Badge>
                                  <Badge variant="outline">
                                    {share.completion_count} completion{share.completion_count !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Created: {new Date(share.created_at).toLocaleDateString()}
                                  {share.expires_at && (
                                    <> • Expires: {new Date(share.expires_at).toLocaleDateString()}</>
                                  )}
                                </p>
                              </div>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => deactivateShare(share.id)}
                              >
                                Deactivate
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Input 
                                value={`${window.location.origin}/public/assessment/${share.share_token}`}
                                readOnly
                                className="font-mono text-sm"
                              />
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(`${window.location.origin}/public/assessment/${share.share_token}`)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="mt-3 text-xs text-muted-foreground">
                              <div className="flex flex-wrap gap-4">
                                {share.require_name && <span>• Requires name</span>}
                                {share.require_email && <span>• Requires email</span>}
                                {share.max_attempts && <span>• Max {share.max_attempts} attempts</span>}
                                {!share.allow_anonymous && <span>• Registration required</span>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={() => navigate(`/assessments/${assessmentId}/edit`)}>
            <Settings className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button onClick={startAssessment} disabled={assessment.status === 'draft'}>
            <Play className="w-4 h-4 mr-2" />
            Start Assessment
          </Button>
        </div>
      </div>

      {/* Assessment Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{assessment.title}</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant={assessment.status === 'published' ? 'default' : 'secondary'}>
                  {assessment.status}
                </Badge>
              </div>
            </div>
          </div>
          {assessment.description && (
            <p className="text-muted-foreground mt-4">{assessment.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assessment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-medium">{assessment.questions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{assessment.duration_minutes} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Max Attempts</p>
                <p className="font-medium">{assessment.max_attempts}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {questionPercentage}% per question
              </Badge>
            </div>
          </div>

          {/* Instructions */}
          {assessment.instructions && (
            <div>
              <h4 className="font-medium mb-2">Instructions</h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{assessment.instructions}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Questions Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment.questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-muted-foreground">
                      Question {index + 1}
                    </span>
                    <Badge variant="secondary">
                      {getQuestionTypeLabel(question.question_type)}
                    </Badge>
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      {questionPercentage}%
                    </Badge>
                  </div>
                  <h4 className="font-medium">{question.title}</h4>
                  {question.question_text && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {question.question_text}
                    </p>
                  )}
                </div>
              </div>

              {/* Question Type Specific Preview */}
              {question.question_type === 'coding' && question.config?.testCases && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <span>{question.config.testCases.length} test cases</span>
                  {question.config.language && (
                    <span> • Language: {question.config.language}</span>
                  )}
                </div>
              )}

              {question.question_type === 'mcq' && question.config?.options && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <span>{question.config.options.length} options</span>
                  {question.config.allowMultiple && (
                    <span> • Multiple selection allowed</span>
                  )}
                </div>
              )}

              {question.question_type === 'subjective' && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {question.config?.minWords && (
                    <span>Min: {question.config.minWords} words</span>
                  )}
                  {question.config?.maxWords && (
                    <span> • Max: {question.config.maxWords} words</span>
                  )}
                </div>
              )}

              {question.question_type === 'file_upload' && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {question.config?.maxFiles && (
                    <span>Max {question.config.maxFiles} files</span>
                  )}
                  {question.config?.allowedTypes && (
                    <span> • Types: {question.config.allowedTypes.join(', ')}</span>
                  )}
                </div>
              )}

              {question.question_type === 'audio' && (
                <div className="mt-3 text-sm text-muted-foreground">
                  {question.config?.maxDurationSeconds && (
                    <span>Max duration: {Math.floor(question.config.maxDurationSeconds / 60)}:{(question.config.maxDurationSeconds % 60).toString().padStart(2, '0')}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Start Assessment Card */}
      {assessment.status === 'published' && (
        <Card className="border-primary">
          <CardContent className="text-center p-6">
            <h3 className="text-lg font-medium mb-2">Ready to start?</h3>
            <p className="text-muted-foreground mb-4">
              Once you begin, you'll have {assessment.duration_minutes} minutes to complete {assessment.questions.length} questions.
            </p>
            <Button onClick={startAssessment} size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {assessment.status === 'draft' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="text-center p-6">
            <h3 className="text-lg font-medium mb-2 text-yellow-800">Draft Assessment</h3>
            <p className="text-yellow-700 mb-4">
              This assessment is still in draft mode. Publish it to allow participants to take it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentPreview;