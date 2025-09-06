import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  UserPlus, 
  Mail, 
  Users,
  Download,
  Upload,
  Search,
  FileText
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { toast } from '@/hooks/use-toast';

const InstructorUserManagement = () => {
  const { users, loading, inviteUser } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [bulkInviteDialogOpen, setBulkInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  // Filter for students only (instructor view)
  const students = users.filter(user => user.role === 'student' || user.role === 'user');

  const filteredStudents = students.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleInviteUser = async () => {
    if (!inviteEmail) return;
    
    try {
      await inviteUser(inviteEmail, 'student');
      setInviteEmail('');
      setInviteDialogOpen(false);
      toast({
        title: "Invitation sent!",
        description: `Invitation sent to ${inviteEmail}`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to send invitation",
        variant: "destructive"
      });
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter valid email addresses",
        variant: "destructive"
      });
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const email of emails) {
        try {
          await inviteUser(email, 'student');
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      setBulkEmails('');
      setBulkInviteDialogOpen(false);
      
      toast({
        title: "Bulk invitation completed",
        description: `${successCount} invitations sent successfully. ${failCount} failed.`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to send bulk invitations",
        variant: "destructive"
      });
    }
  };

  const exportStudentList = () => {
    const csvContent = [
      ['Name', 'Email', 'Status', 'Assessments Taken', 'Joined Date'],
      ...filteredStudents.map(student => [
        student.full_name || 'Unnamed',
        student.email || '',
        student.status,
        student.assessments_taken.toString(),
        new Date(student.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Student Management
            </CardTitle>
            <CardDescription>
              Manage and invite students to your assessments
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportStudentList}>
              <Download className="w-4 h-4 mr-2" />
              Export List
            </Button>
            <Dialog open={bulkInviteDialogOpen} onOpenChange={setBulkInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Invite Students</DialogTitle>
                  <DialogDescription>
                    Enter multiple email addresses separated by commas or new lines.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-emails">Email Addresses</Label>
                    <Textarea
                      id="bulk-emails"
                      placeholder="student1@example.com, student2@example.com&#10;student3@example.com"
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate emails with commas or place each on a new line
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkInvite}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitations
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Student</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new student to join your assessments.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Student Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteUser}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline" className="whitespace-nowrap">
            {filteredStudents.length} Students
          </Badge>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assessments Taken</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{student.full_name || 'Unnamed Student'}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{student.assessments_taken} completed</div>
                      <div className="text-muted-foreground">
                        {student.assessments_created} created
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(student.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No students found. Start by inviting students to join your assessments.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstructorUserManagement;