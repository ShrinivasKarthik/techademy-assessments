import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Shield, 
  BarChart3, 
  Users, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star,
  Globe,
  Activity,
  BookOpen,
  Target,
  Sparkles,
  TrendingUp,
  Lock,
  Clock,
  Code,
  GraduationCap,
  Building,
  Award,
  Calendar,
  Play
} from 'lucide-react';
import heroPeople from '@/assets/hero-people.jpg';
import studentsAssessment from '@/assets/students-assessment.jpg';
import analyticsDashboard from '@/assets/analytics-dashboard.jpg';

const HomePage = () => {
  const demoRoles = [
    { name: "Student", icon: GraduationCap, description: "Access assessments, view progress, track performance" },
    { name: "Faculty", icon: Users, description: "Create assessments, monitor students, generate reports" },
    { name: "Admin", icon: Shield, description: "Manage platform, configure settings, oversee operations" },
    { name: "Instructor", icon: BookOpen, description: "Design curricula, analyze outcomes, provide feedback" }
  ];

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Assessment Creation",
      description: "Generate intelligent assessments with our advanced AI that understands your requirements and creates comprehensive tests."
    },
    {
      icon: Shield,
      title: "Advanced Proctoring System", 
      description: "Ensure assessment integrity with real-time monitoring, face detection, and comprehensive fraud prevention."
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics & Insights",
      description: "Get deep insights into performance patterns, skill gaps, and learning progress with advanced analytics."
    },
    {
      icon: Users,
      title: "Collaborative Assessment Design",
      description: "Work together with your team to create, review, and improve assessments collaboratively."
    },
    {
      icon: Zap,
      title: "Smart Assembly Engine",
      description: "Automatically assemble assessments based on difficulty levels, topics, and learning objectives."
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Create and deliver assessments in multiple languages with automatic translation capabilities."
    }
  ];

  const stats = [
    { label: "Assessments Created", value: "50K+", icon: BookOpen },
    { label: "Students Assessed", value: "100K+", icon: Users },
    { label: "Accuracy Rate", value: "99.5%", icon: Target },
    { label: "Uptime", value: "99.9%", icon: Activity }
  ];

  const useCases = [
    {
      icon: GraduationCap,
      title: "Educational Institutions",
      description: "Universities, colleges, and schools use AssessAI to create comprehensive exams, quizzes, and assessments.",
      image: studentsAssessment
    },
    {
      icon: Building,
      title: "Corporate Training",
      description: "Companies leverage our platform for employee skill assessments, certification programs, and training evaluations.",
      image: analyticsDashboard
    },
    {
      icon: Award,
      title: "Certification Bodies",
      description: "Professional certification organizations trust AssessAI for secure, scalable, and reliable assessment delivery.",
      image: studentsAssessment
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Background Image */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src={heroPeople} 
            alt="People collaborating" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 via-purple-700/85 to-orange-600/90"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center text-white">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              AssessAI Platform
            </h1>
            
            <p className="text-xl md:text-2xl font-light opacity-90 max-w-3xl mx-auto">
              AI-Powered Assessment Creation and Delivery System for Modern Education
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 text-sm px-4 py-2">
                AI-Powered
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 text-sm px-4 py-2">
                Secure Proctoring
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 text-sm px-4 py-2">
                Advanced Analytics
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 shadow-lg">
                <Link to="/auth">
                  <Play className="mr-2 w-5 h-5" />
                  Get Started
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Calendar className="mr-2 w-5 h-5" />
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Try Our Demo
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the platform from different user perspectives. Click any role below to explore the dashboard.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {demoRoles.map((role, index) => {
              const Icon = role.icon;
              return (
                <Card key={index} className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-200">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                      <Icon className="w-8 h-8 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" size="sm" className="w-full mb-3" asChild>
                      <Link to="/auth">Demo Login</Link>
                    </Button>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <p className="text-center text-gray-500 mt-8">
            Each demo showcases role-specific features and permissions
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Comprehensive Assessment Platform
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built specifically for modern education with advanced AI capabilities and security features
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-purple-600">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center text-white">
                  <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Perfect for Every Institution
            </h2>
            <p className="text-lg text-gray-600">
              Trusted by educational institutions and corporations worldwide
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <div className="relative h-48">
                    <img 
                      src={useCase.image} 
                      alt={useCase.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">
                      {useCase.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-orange-600">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="space-y-8 text-white">
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Ready to Transform Your Assessments?
            </h2>
            
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of educators and organizations who trust AssessAI 
              for their assessment needs. Start your journey today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-white text-purple-700 hover:bg-gray-100 text-lg px-8 py-6 shadow-lg">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                Contact Sales
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm opacity-80 pt-8">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Full feature access</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;