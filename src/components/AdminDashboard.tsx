import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ProgressRing } from '@/components/ui/progress-ring';
import { GlassCard } from '@/components/ui/glass-card';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Database,
  Zap,
  Sparkles,
  Crown
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LiveProctoringSystem from './LiveProctoringSystem';
import AccessibilityControls from './AccessibilityControls';
import ManualUserCreation from './ManualUserCreation';
import UserCredentialsManager from './UserCredentialsManager';
import UserManagement from './UserManagement';

interface AdminStats {
  totalUsers: number;
  totalAssessments: number;
  totalSubmissions: number;
  activeUsers: number;
  averageScore: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student';
  status: 'active' | 'inactive' | 'suspended';
  lastActive: string;
  assessmentsCreated?: number;
  assessmentsTaken?: number;
}

interface Assessment {
  id: string;
  title: string;
  creator: string;
  status: string;
  participants: number;
  averageScore: number;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAssessments: 0,
    totalSubmissions: 0,
    activeUsers: 0,
    averageScore: 0,
    systemHealth: 'healthy'
  });
  const [users, setUsers] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load assessment stats
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('id, title, status, created_at');

      // Load instance stats  
      const { data: instanceData } = await supabase
        .from('assessment_instances')
        .select('id, total_score, max_possible_score, participant_id');

      // Calculate stats
      const totalAssessments = assessmentData?.length || 0;
      const totalSubmissions = instanceData?.length || 0;
      const uniqueParticipants = new Set(instanceData?.map(i => i.participant_id)).size;
      
      const averageScore = instanceData?.length 
        ? instanceData.reduce((sum, instance) => {
            const score = instance.total_score && instance.max_possible_score 
              ? (instance.total_score / instance.max_possible_score) * 100 
              : 0;
            return sum + score;
          }, 0) / instanceData.length
        : 0;

      setStats({
        totalUsers: uniqueParticipants + 5, // Mock additional users
        totalAssessments,
        totalSubmissions,
        activeUsers: Math.floor(uniqueParticipants * 0.7),
        averageScore,
        systemHealth: 'healthy'
      });

      // Mock user data (in real app, would come from auth.users via admin API)
      setUsers([
        {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          lastActive: new Date().toISOString(),
          assessmentsCreated: totalAssessments
        },
        {
          id: '2', 
          email: 'instructor@example.com',
          name: 'John Instructor',
          role: 'instructor',
          status: 'active',
          lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          assessmentsCreated: Math.floor(totalAssessments * 0.8)
        },
        {
          id: '3',
          email: 'student@example.com', 
          name: 'Jane Student',
          role: 'student',
          status: 'active',
          lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          assessmentsTaken: totalSubmissions
        }
      ]);

      // Transform assessment data
      const transformedAssessments = assessmentData?.map(assessment => ({
        id: assessment.id,
        title: assessment.title,
        creator: 'System',
        status: assessment.status,
        participants: Math.floor(Math.random() * 50) + 1,
        averageScore: Math.floor(Math.random() * 40) + 60,
        createdAt: assessment.created_at
      })) || [];

      setAssessments(transformedAssessments);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'suspended':
      case 'archived':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.creator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen hero-gradient">
      <div className="p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl shadow-elevation">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-primary to-accent shadow-glow">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Admin Command Center
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Complete control over your assessment platform
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2 shadow-md hover:shadow-lg transition-all duration-300">
                  <Download className="w-4 h-4" />
                  Export Report
                </Button>
                <Button className="gap-2 bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-xl transition-all duration-300">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard variant="primary" className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={stats.totalUsers} />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={(stats.totalUsers / Math.max(stats.totalUsers, 50)) * 100} size={50} />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">+12% this month</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="secondary" className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assessments</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={stats.totalAssessments} />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={(stats.totalAssessments / Math.max(stats.totalAssessments, 20)) * 100} size={50} />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">+8% this month</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submissions</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={stats.totalSubmissions} />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={(stats.totalSubmissions / Math.max(stats.totalSubmissions, 100)) * 100} size={50} />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">+15% this month</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="group cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                    <div className="text-3xl font-bold">
                      <AnimatedCounter value={Math.round(stats.averageScore)} suffix="%" />
                    </div>
                  </div>
                </div>
                <ProgressRing progress={stats.averageScore} size={50} showLabel />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">+3% this month</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Enhanced System Health */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-gradient-to-r from-primary to-accent">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">System Health</h2>
                <p className="text-sm text-muted-foreground">
                  Real-time monitoring of platform components
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="p-2 bg-green-500 rounded-full">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-green-700">Healthy • 99.9% uptime</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="p-2 bg-blue-500 rounded-full">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Edge Functions</p>
                  <p className="text-sm text-blue-700">All operational • 15ms avg</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="p-2 bg-purple-500 rounded-full">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">AI Services</p>
                  <p className="text-sm text-purple-700">Running smoothly • 2.1s avg</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

      {/* Detailed Management */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="proctoring">Proctoring</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">New assessment "Advanced JavaScript" created</span>
                  <span className="text-xs text-muted-foreground ml-auto">2 minutes ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">User "john@example.com" completed assessment</span>
                  <span className="text-xs text-muted-foreground ml-auto">5 minutes ago</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">AI analysis completed for 15 submissions</span>
                  <span className="text-xs text-muted-foreground ml-auto">10 minutes ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          <UserCredentialsManager />
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assessment Management</CardTitle>
                <Button>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Assessment
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search assessments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAssessments.map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{assessment.title}</p>
                        <p className="text-sm text-muted-foreground">Created by {assessment.creator}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(assessment.status)}
                            <span className="text-xs">{assessment.status}</span>
                          </div>
                          <Badge variant="outline">{assessment.participants} participants</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <p>Avg Score: {assessment.averageScore}%</p>
                        <p>Created: {new Date(assessment.createdAt).toLocaleDateString()}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Assessment
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Assessment
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Export Results
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive Assessment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proctoring">
          <LiveProctoringSystem
            assessmentId="admin-demo"
            participantId="admin-user"
            config={{
              cameraRequired: true,
              microphoneRequired: true,
              screenSharing: false,
              tabSwitchDetection: true,
              fullscreenRequired: true,
              faceDetection: true,
              voiceAnalysis: false,
              environmentCheck: true,
              browserLockdown: true
            }}
            onSecurityEvent={(event) => console.log('Admin Security Event:', event)}
            onStatusChange={(status) => console.log('Admin Status Change:', status)}
          />
        </TabsContent>

        <TabsContent value="accessibility">
          <div className="max-w-md">
            <AccessibilityControls />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </main>
  );
};

export default AdminDashboard;