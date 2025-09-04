import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Search, 
  Users,
  Mail,
  Shield,
  BookOpen,
  User,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserCredential {
  id: string;
  email: string;
  full_name: string;
  role: string;
  password: string;
  created_at: string;
}

const UserCredentialsManager: React.FC = () => {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<UserCredential[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // In a real app, this would be stored securely server-side
  const mockCredentials: UserCredential[] = [
    {
      id: '1',
      email: 'admin@demo.com',
      full_name: 'Admin User',
      role: 'admin',
      password: 'admin123!',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      email: 'instructor@demo.com',
      full_name: 'John Instructor',
      role: 'instructor',
      password: 'instructor123!',
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      email: 'student@demo.com',
      full_name: 'Jane Student',
      role: 'student',
      password: 'student123!',
      created_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    // Load demo credentials
    setCredentials(mockCredentials);
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'instructor': return BookOpen;
      case 'student': return Users;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'instructor': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
      variant: "default"
    });
  };

  const togglePasswordVisibility = (id: string) => {
    const newVisiblePasswords = new Set(visiblePasswords);
    if (newVisiblePasswords.has(id)) {
      newVisiblePasswords.delete(id);
    } else {
      newVisiblePasswords.add(id);
    }
    setVisiblePasswords(newVisiblePasswords);
  };

  const filteredCredentials = credentials.filter(cred =>
    cred.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Demo User Credentials
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test accounts for demonstration purposes. In production, credentials would be managed securely.
        </p>
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {filteredCredentials.map((cred) => {
            const RoleIcon = getRoleIcon(cred.role);
            const isPasswordVisible = visiblePasswords.has(cred.id);
            
            return (
              <div key={cred.id} className="border rounded-lg p-4 space-y-3">
                {/* User Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{cred.full_name}</p>
                      <p className="text-sm text-muted-foreground">{cred.email}</p>
                    </div>
                  </div>
                  <Badge variant={getRoleColor(cred.role)} className="capitalize">
                    {cred.role}
                  </Badge>
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Email */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={cred.email}
                        readOnly
                        className="text-sm h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.email, 'Email')}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      Password
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={cred.password}
                        type={isPasswordVisible ? 'text' : 'password'}
                        readOnly
                        className="text-sm h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePasswordVisibility(cred.id)}
                        className="h-8 w-8 p-0"
                      >
                        {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cred.password, 'Password')}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Created: {new Date(cred.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${cred.email}\n${cred.password}`, 'Login credentials')}
                      className="h-6 text-xs"
                    >
                      Copy Both
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCredentials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No user credentials found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Simple Label component if not available
const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`text-sm font-medium ${className}`}>
    {children}
  </div>
);

export default UserCredentialsManager;