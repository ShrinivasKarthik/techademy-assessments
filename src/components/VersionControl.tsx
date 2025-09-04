import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  History,
  GitBranch,
  Clock,
  User,
  RotateCcw,
  ArrowLeftRight,
  MoreHorizontal,
  Edit,
  Archive,
  FileText,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QuestionVersion {
  id: string;
  question_id: string;
  version_number: number;
  title: string;
  description: string | null;
  config: any;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  created_by: string | null;
  created_at: string;
  change_summary: string | null;
  profile?: {
    full_name: string | null;
  };
}

interface CurrentQuestion {
  id: string;
  title: string;
  description: string | null;
  config: any;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  version: number;
  is_active: boolean;
  change_summary: string | null;
}

interface VersionControlProps {
  questionId: string;
  currentQuestion: CurrentQuestion;
  onQuestionUpdated: () => void;
}

export default function VersionControl({ 
  questionId, 
  currentQuestion, 
  onQuestionUpdated 
}: VersionControlProps) {
  const [versions, setVersions] = useState<QuestionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<QuestionVersion | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareVersion, setCompareVersion] = useState<QuestionVersion | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchVersionHistory();
  }, [questionId]);

  const fetchVersionHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('question_versions')
        .select(`
          *,
          profiles!created_by(full_name)
        `)
        .eq('question_id', questionId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      setVersions(data || []);
      
    } catch (error) {
      console.error('Error fetching version history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch version history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const revertToVersion = async (version: QuestionVersion) => {
    if (!window.confirm(`Are you sure you want to revert to version ${version.version_number}? This will create a new version with the old content.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({
          title: version.title,
          description: version.description,
          config: version.config,
          tags: version.tags,
          difficulty: version.difficulty,
          points: version.points,
          change_summary: `Reverted to version ${version.version_number}`,
        })
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Version Reverted",
        description: `Successfully reverted to version ${version.version_number}`,
      });

      onQuestionUpdated();
      await fetchVersionHistory();
      
    } catch (error) {
      console.error('Error reverting version:', error);
      toast({
        title: "Revert Failed",
        description: "Failed to revert to the selected version",
        variant: "destructive",
      });
    }
  };

  const archiveQuestion = async () => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          is_active: false,
          archived_at: new Date().toISOString(),
          change_summary: archiveReason || 'Question archived',
        })
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Question Archived",
        description: "Question has been archived successfully",
      });

      setShowArchiveDialog(false);
      setArchiveReason('');
      onQuestionUpdated();
      
    } catch (error) {
      console.error('Error archiving question:', error);
      toast({
        title: "Archive Failed",
        description: "Failed to archive the question",
        variant: "destructive",
      });
    }
  };

  const restoreQuestion = async () => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          is_active: true,
          archived_at: null,
          change_summary: 'Question restored from archive',
        })
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Question Restored",
        description: "Question has been restored from archive",
      });

      onQuestionUpdated();
      
    } catch (error) {
      console.error('Error restoring question:', error);
      toast({
        title: "Restore Failed",
        description: "Failed to restore the question",
        variant: "destructive",
      });
    }
  };

  const getVersionStatus = (version: QuestionVersion) => {
    if (version.version_number === currentQuestion.version) {
      return <Badge variant="default">Current</Badge>;
    }
    return <Badge variant="outline">v{version.version_number}</Badge>;
  };

  const renderVersionDiff = (current: any, previous: any) => {
    const changes = [];
    
    if (current.title !== previous.title) {
      changes.push(`Title: "${previous.title}" → "${current.title}"`);
    }
    
    if (current.description !== previous.description) {
      changes.push('Description updated');
    }
    
    if (current.difficulty !== previous.difficulty) {
      changes.push(`Difficulty: ${previous.difficulty} → ${current.difficulty}`);
    }
    
    if (current.points !== previous.points) {
      changes.push(`Points: ${previous.points} → ${current.points}`);
    }
    
    if (JSON.stringify(current.config) !== JSON.stringify(previous.config)) {
      changes.push('Configuration updated');
    }
    
    if (JSON.stringify(current.tags) !== JSON.stringify(previous.tags)) {
      changes.push('Tags updated');
    }

    return changes.length > 0 ? changes : ['No significant changes'];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version Control
          </CardTitle>
          
          <div className="flex gap-2">
            {currentQuestion.is_active ? (
              <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Archive Question</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Archiving will make this question inactive and remove it from assessments. 
                      You can restore it later if needed.
                    </p>
                    <div className="space-y-2">
                      <Label>Reason for archiving (optional)</Label>
                      <Textarea
                        value={archiveReason}
                        onChange={(e) => setArchiveReason(e.target.value)}
                        placeholder="Explain why this question is being archived..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={archiveQuestion}>
                        Archive Question
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button variant="outline" size="sm" onClick={restoreQuestion}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Version Info */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Current Version: {currentQuestion.version}</div>
              <div className="text-sm text-muted-foreground">
                Status: {currentQuestion.is_active ? 'Active' : 'Archived'}
              </div>
            </div>
          </div>
          <Badge variant={currentQuestion.is_active ? "default" : "secondary"}>
            {currentQuestion.is_active ? 'Active' : 'Archived'}
          </Badge>
        </div>

        {/* Version History */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted h-20 rounded-lg"></div>
            ))}
          </div>
        ) : versions.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Version History</h4>
              <Badge variant="outline">{versions.length} versions</Badge>
            </div>
            
            {versions.map((version, index) => {
              const nextVersion = versions[index + 1];
              const changes = nextVersion ? renderVersionDiff(version, nextVersion) : ['Initial version'];
              
              return (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getVersionStatus(version)}
                          <span className="font-medium">Version {version.version_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                        {version.profile?.full_name && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {version.profile.full_name}
                          </div>
                        )}
                      </div>

                      <div className="text-sm font-medium mb-1">{version.title}</div>
                      
                      {version.change_summary && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {version.change_summary}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Changes: {changes.join(', ')}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedVersion(version);
                            // Here you would open a detailed view dialog
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        {version.version_number !== currentQuestion.version && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setCompareVersion(version);
                                setShowCompareDialog(true);
                              }}
                            >
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              Compare with Current
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              onClick={() => revertToVersion(version)}
                              className="text-orange-600 focus:text-orange-600"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Revert to This Version
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="mx-auto h-8 w-8 mb-3" />
            <p>No version history available</p>
          </div>
        )}

        {/* Compare Dialog */}
        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Compare Versions</DialogTitle>
            </DialogHeader>
            
            {compareVersion && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Current Version ({currentQuestion.version})</h4>
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm">{currentQuestion.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Difficulty</Label>
                      <Badge variant="outline" className="ml-2">
                        {currentQuestion.difficulty}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Points</Label>
                      <p className="text-sm">{currentQuestion.points}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentQuestion.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Version {compareVersion.version_number}</h4>
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm">{compareVersion.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Difficulty</Label>
                      <Badge variant="outline" className="ml-2">
                        {compareVersion.difficulty}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Points</Label>
                      <p className="text-sm">{compareVersion.points}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {compareVersion.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}