import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Key, Mail, User, Shield, BookOpen, Users, Eye, EyeOff, Upload, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface UserCreationData {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'instructor' | 'student' | 'user';
}

interface DirectOnboardingProps {
  onUsersCreated?: () => void;
}

const DirectOnboarding: React.FC<DirectOnboardingProps> = ({ onUsersCreated }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserCreationData>({
    email: '',
    password: '',
    fullName: '',
    role: 'user'
  });

  const [batchUsers, setBatchUsers] = useState<UserCreationData[]>([]);
  const [csvText, setCsvText] = useState('');

  const roles = [
    { value: 'admin', label: 'Administrator', icon: Shield, description: 'Full system access' },
    { value: 'instructor', label: 'Instructor', icon: BookOpen, description: 'Create and manage assessments' },
    { value: 'student', label: 'Student', icon: Users, description: 'Take assessments' },
    { value: 'user', label: 'User', icon: User, description: 'Basic access' }
  ];

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const createSingleUser = async (userData: UserCreationData) => {
    const { data, error } = await supabase.functions.invoke('create-user-direct', {
      body: userData
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.fullName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await createSingleUser(formData);

      toast({
        title: "User Created Successfully",
        description: `${formData.fullName} has been created as a ${formData.role}. They can now sign in immediately.`,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'user'
      });
      
      onUsersCreated?.();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "User Creation Failed",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const parseCsvText = () => {
    if (!csvText.trim()) return;

    try {
      const lines = csvText.trim().split('\n');
      const users: UserCreationData[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (email,fullName,role,password)
        const [email, fullName, role = 'user', password] = line.split(',').map(s => s.trim());
        
        if (!email || !fullName) {
          toast({
            title: "Invalid CSV Format",
            description: `Line ${i + 1}: Email and full name are required`,
            variant: "destructive"
          });
          return;
        }

        const generatedPassword = password || generateRandomPassword();
        
        users.push({
          email,
          fullName,
          role: (role as any) || 'user',
          password: generatedPassword
        });
      }

      setBatchUsers(users);
      toast({
        title: "CSV Parsed",
        description: `${users.length} users ready for creation`,
      });
    } catch (error) {
      toast({
        title: "CSV Parse Error",
        description: "Please check your CSV format",
        variant: "destructive"
      });
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleBatchSubmit = async () => {
    if (batchUsers.length === 0) {
      toast({
        title: "No Users to Create",
        description: "Please add users first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    let successful = 0;
    let failed = 0;
    const failedUsers: string[] = [];

    try {
      for (const user of batchUsers) {
        try {
          await createSingleUser(user);
          successful++;
        } catch (error: any) {
          failed++;
          failedUsers.push(`${user.email}: ${error.message}`);
          console.error(`Failed to create user ${user.email}:`, error);
        }
      }

      toast({
        title: "Batch Creation Complete",
        description: `Successfully created ${successful} users. ${failed} failed.`,
        variant: successful > 0 ? "default" : "destructive"
      });

      if (failed > 0) {
        console.log('Failed users:', failedUsers);
      }

      // Clear batch data
      setBatchUsers([]);
      setCsvText('');
      onUsersCreated?.();

    } catch (error: any) {
      toast({
        title: "Batch Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportTemplate = () => {
    const template = "email,fullName,role,password\nuser@example.com,John Doe,user,\ninstructor@example.com,Jane Smith,instructor,custompassword123";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedRole = roles.find(role => role.value === formData.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Direct User Onboarding</h1>
        <p className="text-muted-foreground">
          Create user accounts directly without email verification
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Single User Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create Single User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Password
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Generate
                  </Button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  User Role
                </Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => {
                      const Icon = role.icon;
                      return (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Info */}
              {selectedRole && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <selectedRole.icon className="w-4 h-4" />
                      <span className="font-medium">{selectedRole.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {formData.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedRole.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Batch User Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Batch User Creation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>CSV Import</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <textarea
                className="w-full h-32 p-2 border rounded-md text-sm font-mono"
                placeholder="email,fullName,role,password&#10;user@example.com,John Doe,user,&#10;instructor@example.com,Jane Smith,instructor,custompassword123"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: email,fullName,role,password (password is optional - will be generated if empty)
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={parseCsvText} disabled={!csvText.trim()}>
                Parse CSV
              </Button>
              <Button 
                onClick={handleBatchSubmit} 
                disabled={loading || batchUsers.length === 0}
                className="flex-1"
              >
                {loading ? "Creating..." : `Create ${batchUsers.length} Users`}
              </Button>
            </div>

            {batchUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Users to Create ({batchUsers.length})</Label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {batchUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                      <span>{user.fullName} ({user.email})</span>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DirectOnboarding;