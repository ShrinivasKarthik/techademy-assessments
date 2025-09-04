import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Key, Mail, User, Shield, BookOpen, Users, Eye, EyeOff } from 'lucide-react';

interface UserCreationData {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'instructor' | 'student' | 'user';
}

interface ManualUserCreationProps {
  onUserCreated?: () => void;
}

const ManualUserCreation: React.FC<ManualUserCreationProps> = ({ onUserCreated }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserCreationData>({
    email: '',
    password: '',
    fullName: '',
    role: 'user'
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // For demo purposes, create a mock user entry directly in profiles table
      // In production, you'd use Supabase admin functions or server-side implementation
      
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingProfile) {
        toast({
          title: "User Already Exists",
          description: "A user with this email already exists",
          variant: "destructive"
        });
        return;
      }

      // Create a mock profile entry (simulate user creation)
      const mockUserId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: mockUserId,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast({
          title: "User Creation Failed",
          description: profileError.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Demo User Created",
        description: `${formData.fullName} has been added as a ${formData.role} (demo mode - password stored for reference: ${formData.password})`,
        variant: "default"
      });

      // Reset form and close dialog
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'user'
      });
      setOpen(false);
      
      // Notify parent component
      if (onUserCreated) {
        onUserCreated();
      }

    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast({
        title: "Unexpected Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find(role => role.value === formData.role);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Create User Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create New User
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters. User can change this later.
            </p>
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

          {/* Role Info Card */}
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

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualUserCreation;