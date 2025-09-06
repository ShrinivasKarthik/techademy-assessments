import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock, User, Zap, Brain, Shield, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import RoleSelector from '@/components/RoleSelector';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'student' | 'instructor' | 'admin'>('user');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been successfully signed in.",
      });
      navigate('/home');
    }
    
    setLoading(false);
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string, role: string) => {
    setLoading(true);
    setError('');
    
    const { error } = await signIn(demoEmail, demoPassword);
    
    if (error) {
      setError(error.message);
    } else {
      toast({
        title: `Welcome, ${role}!`,
        description: "You've been logged in with demo credentials.",
      });
      navigate('/home');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, selectedRole);
    
    if (error) {
      setError(error.message);
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
                Techademy Assessments
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 mt-2">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-6">
                  {/* Demo Login Section */}
                  <div className="space-y-4 p-6 bg-gradient-to-br from-purple-50 to-orange-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 mb-4">
                      <Zap className="w-5 h-5" />
                      Quick Demo Login
                    </div>
                    <div className="grid gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDemoLogin('admin@demo.com', 'demo123', 'Admin')}
                        disabled={loading}
                        className="justify-start bg-white/80 hover:bg-white border-purple-200 hover:border-purple-300 transition-all duration-300"
                      >
                        <Shield className="w-4 h-4 mr-3 text-purple-600" />
                        Login as Admin
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDemoLogin('teacher@demo.com', 'demo123', 'Teacher')}
                        disabled={loading}
                        className="justify-start bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300 transition-all duration-300"
                      >
                        <BookOpen className="w-4 h-4 mr-3 text-blue-600" />
                        Login as Teacher
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDemoLogin('student@demo.com', 'demo123', 'Student')}
                        disabled={loading}
                        className="justify-start bg-white/80 hover:bg-white border-green-200 hover:border-green-300 transition-all duration-300"
                      >
                        <GraduationCap className="w-4 h-4 mr-3 text-green-600" />
                        Login as Student
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm uppercase">
                      <span className="bg-white px-4 text-gray-500 font-medium">Or sign in manually</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-5">
                    {error && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-700">{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-gray-700 font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-gray-700 font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Signing in...
                        </div>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-5">
                  <form onSubmit={handleSignUp} className="space-y-5">
                    {error && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-700">{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-gray-700 font-medium">Full Name (Optional)</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-gray-700 font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-gray-700 font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Create a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          required
                          minLength={6}
                        />
                      </div>
                      <PasswordStrengthIndicator password={password} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-gray-700 font-medium">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Select Your Role</Label>
                      <RoleSelector
                        selectedRole={selectedRole}
                        onRoleSelect={(role) => setSelectedRole(role as any)}
                        disabled={loading}
                      />
                    </div>
                  
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating account...
                        </div>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;