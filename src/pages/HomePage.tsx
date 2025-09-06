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
  Award
} from 'lucide-react';
import heroDashboard from '@/assets/hero-dashboard.jpg';
import studentsAssessment from '@/assets/students-assessment.jpg';
import analyticsDashboard from '@/assets/analytics-dashboard.jpg';

const HomePage = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Assessment Creation",
      description: "Generate intelligent assessments with our advanced AI that understands your requirements and creates comprehensive tests.",
      gradient: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      icon: Shield,
      title: "Advanced Proctoring System", 
      description: "Ensure assessment integrity with real-time monitoring, face detection, and comprehensive fraud prevention.",
      gradient: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics & Insights",
      description: "Get deep insights into performance patterns, skill gaps, and learning progress with advanced analytics.",
      gradient: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20"
    },
    {
      icon: Users,
      title: "Collaborative Assessment Design",
      description: "Work together with your team to create, review, and improve assessments collaboratively.",
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      icon: Zap,
      title: "Smart Assembly Engine",
      description: "Automatically assemble assessments based on difficulty levels, topics, and learning objectives.",
      gradient: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20"
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Create and deliver assessments in multiple languages with automatic translation capabilities.",
      gradient: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20"
    }
  ];

  const stats = [
    { label: "Assessments Created", value: "50K+", icon: BookOpen, color: "text-purple-600" },
    { label: "Students Assessed", value: "100K+", icon: Users, color: "text-blue-600" },
    { label: "Accuracy Rate", value: "99.5%", icon: Target, color: "text-green-600" },
    { label: "Uptime", value: "99.9%", icon: Activity, color: "text-orange-600" }
  ];

  const useCases = [
    {
      icon: GraduationCap,
      title: "Educational Institutions",
      description: "Universities, colleges, and schools use AssessAI to create comprehensive exams, quizzes, and assessments.",
      image: studentsAssessment,
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: Building,
      title: "Corporate Training",
      description: "Companies leverage our platform for employee skill assessments, certification programs, and training evaluations.",
      image: analyticsDashboard,
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: Award,
      title: "Certification Bodies",
      description: "Professional certification organizations trust AssessAI for secure, scalable, and reliable assessment delivery.",
      image: heroDashboard,
      gradient: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-orange-50 to-blue-50 dark:from-purple-950/20 dark:via-orange-950/20 dark:to-blue-950/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="text-sm px-4 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white hover:from-purple-700 hover:to-orange-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Next-Generation Assessment Platform
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Transform Your 
                <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent block lg:inline"> Assessment Process</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Create, deliver, and analyze assessments with the power of artificial intelligence. 
                Our platform combines advanced proctoring, intelligent question generation, and 
                comprehensive analytics to revolutionize how you evaluate learning.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="text-lg px-8 py-6 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link to="/auth">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="text-lg px-8 py-6 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300">
                  <Link to="/auth">
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-orange-400/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-2 shadow-2xl">
                <img 
                  src={heroDashboard} 
                  alt="AssessAI Dashboard" 
                  className="w-full h-auto rounded-2xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-200 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-orange-200 rounded-full opacity-40 animate-pulse delay-300"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-blue-200 rounded-full opacity-50 animate-pulse delay-700"></div>
      </section>

      {/* Colorful Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-purple-600 to-orange-500">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center space-y-2 text-white">
                  <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-purple-50/50 dark:to-purple-950/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              Powerful Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need for 
              <span className="bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent"> Modern Assessment</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the comprehensive toolkit that makes assessment creation, 
              delivery, and analysis effortless and effective.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className={`group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-lg ${feature.bgColor} overflow-hidden relative`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-purple-700 transition-colors duration-300">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Use Cases Section with Images */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950/10 dark:to-purple-950/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              Use Cases
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Perfect for 
              <span className="bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent"> Every Institution</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Trusted by educational institutions and corporations worldwide
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card key={index} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="relative h-48 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-20`}></div>
                    <img 
                      src={useCase.image} 
                      alt={useCase.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className={`absolute top-4 right-4 w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {useCase.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 via-purple-700 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto max-w-4xl text-center relative">
          <div className="space-y-8 text-white">
            <Badge variant="secondary" className="text-sm px-4 py-2 bg-white/20 text-white hover:bg-white/30">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Your Journey Today
            </Badge>
            
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Ready to Transform Your Assessments?
            </h2>
            
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of educators and organizations who trust AssessAI 
              for their assessment needs. Start your free trial today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8 py-6 bg-white text-purple-700 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300">
                Contact Sales
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-sm opacity-80 pt-8">
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
        
        {/* Floating shapes */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-orange-300/20 rounded-full animate-pulse delay-300"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-300/20 rounded-full animate-pulse delay-700"></div>
      </section>
    </div>
  );
};

export default HomePage;