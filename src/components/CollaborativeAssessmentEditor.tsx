import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Share2,
  MoreHorizontal,
  Send,
  History
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCollaborativeSession } from '@/hooks/useCollaborativeSession';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  status: 'online' | 'offline' | 'away';
  lastActive: Date;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  resolved: boolean;
  questionId?: string;
  parentId?: string;
  replies?: Comment[];
}

interface VersionHistory {
  id: string;
  version: string;
  authorId: string;
  authorName: string;
  changes: string;
  createdAt: Date;
  description: string;
}

interface CollaborativeAssessmentEditorProps {
  assessmentId: string;
  onSave?: (data: any) => void;
}

const CollaborativeAssessmentEditor: React.FC<CollaborativeAssessmentEditorProps> = ({
  assessmentId,
  onSave
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // Use real-time collaborative session
  const {
    isConnected,
    sessionId,
    collaborators: liveCollaborators,
    comments: liveComments,
    activity,
    addComment,
    resolveComment,
    broadcastAssessmentChange
  } = useCollaborativeSession(assessmentId);

  // Version history (could be enhanced with real-time updates)
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([
    {
      id: '1',
      version: '1.3',
      authorId: '1',
      authorName: 'John Doe',
      changes: 'Added 3 new questions, updated scoring rubric',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      description: 'Enhanced assessment with more coding challenges'
    },
    {
      id: '2',
      version: '1.2',
      authorId: '2',
      authorName: 'Jane Smith',
      changes: 'Modified difficulty levels for questions 5-8',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      description: 'Balanced question difficulty distribution'
    }
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'reviewer' | 'viewer'>('viewer');
  const [newComment, setNewComment] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Map live data to component state
  const collaborators = liveCollaborators.map(collab => ({
    id: collab.id,
    name: collab.name,
    email: collab.email,
    role: collab.role,
    status: collab.status,
    lastActive: collab.lastActive
  }));

  const comments = liveComments.map(comment => ({
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt,
    resolved: comment.resolved,
    questionId: comment.questionId
  }));

  const inviteCollaborator = async () => {
    if (!inviteEmail) return;

    try {
      // This would integrate with real invitation system
      setInviteEmail('');
      
      toast({
        title: "Invitation Sent",
        description: `Invited ${inviteEmail} as ${inviteRole}`
      });
    } catch (error) {
      toast({
        title: "Failed to invite",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    await addComment(newComment, selectedQuestionId || undefined);
    setNewComment('');
    
    toast({
      title: "Comment Added",
      description: "Your comment has been added to the discussion"
    });
  };

  const handleResolveComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    await resolveComment(commentId, !comment.resolved);
  };

  const updateCollaboratorRole = (collaboratorId: string, newRole: Collaborator['role']) => {
    // This would integrate with real-time collaboration system
    toast({
      title: "Role Updated",
      description: "Collaborator role has been updated"
    });
  };

  const removeCollaborator = (collaboratorId: string) => {
    // This would integrate with real-time collaboration system
    toast({
      title: "Collaborator Removed",
      description: "Collaborator has been removed from the assessment"
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'destructive';
      case 'editor': return 'default';
      case 'reviewer': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborative Assessment Editor
            {isConnected && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Live
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Work together with your team to create and review assessments in real-time
            {sessionId && (
              <span className="block text-xs text-muted-foreground mt-1">
                Session: {sessionId}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="collaborators" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="collaborators">Team</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="collaborators" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Team Members</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Collaborator</DialogTitle>
                      <DialogDescription>
                        Add a new team member to collaborate on this assessment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="colleague@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setInviteRole('editor')}>
                              Editor - Can edit and modify content
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setInviteRole('reviewer')}>
                              Reviewer - Can comment and suggest changes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setInviteRole('viewer')}>
                              Viewer - Can only view the assessment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Button onClick={inviteCollaborator} className="w-full">
                        Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {collaborators.map(collaborator => (
                  <Card key={collaborator.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="" />
                            <AvatarFallback>
                              {collaborator.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(collaborator.status)}`} />
                        </div>
                        <div>
                          <div className="font-medium">{collaborator.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {collaborator.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last active: {formatTimeAgo(collaborator.lastActive)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleColor(collaborator.role)}>
                          {collaborator.role}
                        </Badge>
                        {collaborator.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => updateCollaboratorRole(collaborator.id, 'editor')}>
                                Make Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateCollaboratorRole(collaborator.id, 'reviewer')}>
                                Make Reviewer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateCollaboratorRole(collaborator.id, 'viewer')}>
                                Make Viewer
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => removeCollaborator(collaborator.id)}
                                className="text-destructive"
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Discussion</h3>
                <Badge variant="outline">
                  {comments.filter(c => !c.resolved).length} Open
                </Badge>
              </div>

              <Card className="p-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment or question..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Commenting on: General Assessment
                    </div>
                    <Button onClick={handleAddComment} size="sm" className="gap-2">
                      <Send className="w-4 h-4" />
                      Comment
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                {comments.map(comment => (
                  <Card key={comment.id} className={`p-4 ${comment.resolved ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {comment.authorName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                          {comment.questionId && (
                            <Badge variant="outline" className="text-xs">
                              Question {comment.questionId}
                            </Badge>
                          )}
                          {comment.resolved && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveComment(comment.id)}
                            className="text-xs"
                          >
                            {comment.resolved ? 'Unresolve' : 'Resolve'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="versions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Version History</h3>
                <Button variant="outline" className="gap-2">
                  <GitBranch className="w-4 h-4" />
                  Create Branch
                </Button>
              </div>

              <div className="space-y-3">
                {versionHistory.map((version, index) => (
                  <Card key={version.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <History className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">Version {version.version}</span>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {version.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {version.changes}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            By {version.authorName} • {formatTimeAgo(version.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {index !== 0 && (
                          <Button variant="ghost" size="sm">
                            <GitBranch className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <Badge variant="outline">Live Updates</Badge>
              </div>

              <div className="space-y-3">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">Jane Smith</span> is currently editing Question 5
                      </p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">Bob Johnson</span> added a comment
                      </p>
                      <p className="text-xs text-muted-foreground">5 minutes ago</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">John Doe</span> saved changes to the assessment
                      </p>
                      <p className="text-xs text-muted-foreground">30 minutes ago</p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaborativeAssessmentEditor;