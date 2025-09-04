import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Settings, 
  Shield,
  Share2,
  Copy,
  Eye,
  Edit,
  Trash2,
  Crown,
  BookOpen,
  Clock,
  MessageSquare,
  Bell
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  lastActive: string;
  assessmentsCreated: number;
  collaborationsCount: number;
}

interface AssessmentShare {
  id: string;
  title: string;
  sharedWith: string[];
  permissions: 'view' | 'edit' | 'admin';
  shareLink?: string;
  expiresAt?: string;
  isPublic: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  sentAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

const CollaborationSystem: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      status: 'active',
      joinedAt: '2024-01-15',
      lastActive: new Date().toISOString(),
      assessmentsCreated: 15,
      collaborationsCount: 8
    },
    {
      id: '2',
      name: 'Jane Smith', 
      email: 'jane@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: '2024-01-20',
      lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      assessmentsCreated: 8,
      collaborationsCount: 12
    }
  ]);
  
  const [sharedAssessments, setSharedAssessments] = useState<AssessmentShare[]>([
    {
      id: '1',
      title: 'JavaScript Fundamentals',
      sharedWith: ['jane@example.com', 'bob@example.com'],
      permissions: 'edit',
      shareLink: 'https://example.com/share/js-fund-123',
      isPublic: false
    },
    {
      id: '2',
      title: 'React Development Quiz',
      sharedWith: ['jane@example.com'],
      permissions: 'view',
      isPublic: true
    }
  ]);

  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: '1',
      email: 'newuser@example.com',
      role: 'editor',
      sentAt: '2024-01-25',
      status: 'pending'
    }
  ]);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer',
    message: ''
  });

  const [shareForm, setShareForm] = useState({
    assessmentId: '',
    emails: '',
    permissions: 'view' as 'view' | 'edit' | 'admin',
    expiresIn: '30', // days
    allowPublic: false
  });

  const sendInvitation = async () => {
    if (!inviteForm.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: inviteForm.email,
          role: inviteForm.role,
          message: inviteForm.message
        }
      });

      if (error) throw error;

      const newInvitation: Invitation = {
        id: Date.now().toString(),
        email: inviteForm.email,
        role: inviteForm.role,
        sentAt: new Date().toISOString(),
        status: 'pending'
      };

      setInvitations(prev => [...prev, newInvitation]);
      setInviteForm({ email: '', role: 'viewer', message: '' });

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteForm.email}`
      });

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Failed to send invitation",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const shareAssessment = async () => {
    if (!shareForm.assessmentId || !shareForm.emails.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an assessment and enter email addresses.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const emails = shareForm.emails.split(',').map(email => email.trim()).filter(Boolean);
      
      const { error } = await supabase.functions.invoke('share-assessment', {
        body: {
          assessmentId: shareForm.assessmentId,
          emails,
          permissions: shareForm.permissions,
          expiresIn: parseInt(shareForm.expiresIn),
          allowPublic: shareForm.allowPublic
        }
      });

      if (error) throw error;

      // Update local state
      const assessmentTitle = `Assessment ${shareForm.assessmentId}`;
      const newShare: AssessmentShare = {
        id: Date.now().toString(),
        title: assessmentTitle,
        sharedWith: emails,
        permissions: shareForm.permissions,
        shareLink: shareForm.allowPublic ? `https://example.com/share/${shareForm.assessmentId}` : undefined,
        expiresAt: new Date(Date.now() + parseInt(shareForm.expiresIn) * 24 * 60 * 60 * 1000).toISOString(),
        isPublic: shareForm.allowPublic
      };

      setSharedAssessments(prev => [...prev, newShare]);
      setShareForm({ assessmentId: '', emails: '', permissions: 'view', expiresIn: '30', allowPublic: false });

      toast({
        title: "Assessment shared",
        description: `Assessment shared with ${emails.length} user(s)`
      });

    } catch (error) {
      console.error('Error sharing assessment:', error);
      toast({
        title: "Failed to share assessment",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard"
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'editor': return <Edit className="w-4 h-4 text-green-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collaboration & Sharing</h2>
          <p className="text-muted-foreground">Manage team members and share assessments</p>
        </div>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="team">Team Management</TabsTrigger>
          <TabsTrigger value="sharing">Assessment Sharing</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Overview */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Team Members ({teamMembers.length})
                    </CardTitle>
                    <Button size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.name}</p>
                              {getRoleIcon(member.role)}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStatusColor(member.status)}>
                                {member.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p>{member.assessmentsCreated} assessments</p>
                            <p>{member.collaborationsCount} collaborations</p>
                            <p className="text-muted-foreground">
                              Active {new Date(member.lastActive).toLocaleDateString()}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Shield className="w-4 h-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              {member.role !== 'owner' && (
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invite Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Invite New Member
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(value: 'admin' | 'editor' | 'viewer') => 
                    setInviteForm(prev => ({ ...prev, role: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - View assessments only</SelectItem>
                      <SelectItem value="editor">Editor - Create and edit assessments</SelectItem>
                      <SelectItem value="admin">Admin - Full access except billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Personal Message (Optional)</Label>
                  <Textarea
                    placeholder="Welcome to our team! Looking forward to collaborating..."
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                <Button onClick={sendInvitation} disabled={loading} className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sharing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Share New Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Share Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Assessment</Label>
                  <Select value={shareForm.assessmentId} onValueChange={(value) => 
                    setShareForm(prev => ({ ...prev, assessmentId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an assessment..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">JavaScript Fundamentals</SelectItem>
                      <SelectItem value="2">React Development</SelectItem>
                      <SelectItem value="3">Python Algorithms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email Addresses</Label>
                  <Textarea
                    placeholder="Enter email addresses separated by commas..."
                    value={shareForm.emails}
                    onChange={(e) => setShareForm(prev => ({ ...prev, emails: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <Select value={shareForm.permissions} onValueChange={(value: 'view' | 'edit' | 'admin') => 
                    setShareForm(prev => ({ ...prev, permissions: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="edit">View & Edit</SelectItem>
                      <SelectItem value="admin">Full Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expires In (Days)</Label>
                  <Select value={shareForm.expiresIn} onValueChange={(value) => 
                    setShareForm(prev => ({ ...prev, expiresIn: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                      <SelectItem value="365">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowPublic"
                    checked={shareForm.allowPublic}
                    onChange={(e) => setShareForm(prev => ({ ...prev, allowPublic: e.target.checked }))}
                  />
                  <Label htmlFor="allowPublic">Generate public share link</Label>
                </div>

                <Button onClick={shareAssessment} disabled={loading} className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  {loading ? 'Sharing...' : 'Share Assessment'}
                </Button>
              </CardContent>
            </Card>

            {/* Shared Assessments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Shared Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sharedAssessments.map((shared) => (
                    <div key={shared.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{shared.title}</h3>
                        <div className="flex items-center gap-2">
                          {shared.isPublic && <Badge variant="outline">Public</Badge>}
                          <Badge variant="secondary">{shared.permissions}</Badge>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Shared with: {shared.sharedWith.join(', ')}
                      </div>

                      {shared.shareLink && (
                        <div className="flex items-center gap-2">
                          <Input
                            value={shared.shareLink}
                            readOnly
                            className="text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyShareLink(shared.shareLink!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {shared.expiresAt && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Expires: {new Date(shared.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Pending Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{invitation.role}</Badge>
                        <Badge className={getStatusColor(invitation.status)}>
                          {invitation.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sent {new Date(invitation.sentAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" />
                        Resend
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {invitations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending invitations</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    role: 'Owner',
                    icon: Crown,
                    color: 'text-yellow-500',
                    permissions: ['Full platform access', 'Billing management', 'Delete assessments', 'Manage all users', 'Export data']
                  },
                  {
                    role: 'Admin',
                    icon: Shield,
                    color: 'text-blue-500',
                    permissions: ['Create assessments', 'Manage team members', 'View all analytics', 'Share assessments', 'Edit settings']
                  },
                  {
                    role: 'Editor',
                    icon: Edit,
                    color: 'text-green-500',
                    permissions: ['Create assessments', 'Edit shared assessments', 'View assigned analytics', 'Collaborate on projects']
                  },
                  {
                    role: 'Viewer',
                    icon: Eye,
                    color: 'text-gray-500',
                    permissions: ['View shared assessments', 'Take assessments', 'View results', 'Download reports']
                  }
                ].map((roleInfo) => (
                  <div key={roleInfo.role} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <roleInfo.icon className={`w-6 h-6 ${roleInfo.color}`} />
                      <h3 className="text-lg font-semibold">{roleInfo.role}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {roleInfo.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {permission}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollaborationSystem;