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
  Target
} from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Assessment Creation",
      description: "Generate intelligent assessments with our advanced AI that understands your requirements and creates comprehensive tests.",
      color: "text-blue-600"
    },
    {
      icon: Shield,
      title: "Advanced Proctoring System",
      description: "Ensure assessment integrity with real-time monitoring, face detection, and comprehensive fraud prevention.",
      color: "text-green-600"
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics & Insights",
      description: "Get deep insights into performance patterns, skill gaps, and learning progress with advanced analytics.",
      color: "text-purple-600"
    },
    {
      icon: Users,
      title: "Collaborative Assessment Design",
      description: "Work together with your team to create, review, and improve assessments collaboratively.",
      color: "text-orange-600"
    },
    {
      icon: Zap,
      title: "Smart Assembly Engine",
      description: "Automatically assemble assessments based on difficulty levels, topics, and learning objectives.",
      color: "text-yellow-600"
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Create and deliver assessments in multiple languages with automatic translation capabilities.",
      color: "text-indigo-600"
    }
  ];

  const stats = [
    { label: "Assessments Created", value: "50K+", icon: BookOpen },
    { label: "Students Assessed", value: "100K+", icon: Users },
    { label: "Accuracy Rate", value: "99.5%", icon: Target },
    { label: "Uptime", value: "99.9%", icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              Next-Generation Assessment Platform
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Transform Your 
              <span className="text-primary block md:inline"> Assessment Process</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Create, deliver, and analyze assessments with the power of artificial intelligence. 
              Our platform combines advanced proctoring, intelligent question generation, and 
              comprehensive analytics to revolutionize how you evaluate learning.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="text-lg px-8 py-6">
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-lg px-8 py-6">
                <Link to="/auth">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center space-y-2">
                  <Icon className="w-8 h-8 mx-auto text-primary" />
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Powerful Features for Modern Assessment
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, deliver, and analyze assessments 
              with confidence and precision.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
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

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Perfect for Every Institution
            </h2>
            <p className="text-xl text-muted-foreground">
              Trusted by educational institutions and corporations worldwide
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8">
              <CardHeader>
                <BookOpen className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                <CardTitle>Educational Institutions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Universities, colleges, and schools use AssessAI to create 
                  comprehensive exams, quizzes, and assessments.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8">
              <CardHeader>
                <Users className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <CardTitle>Corporate Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Companies leverage our platform for employee skill assessments, 
                  certification programs, and training evaluations.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8">
              <CardHeader>
                <CheckCircle className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                <CardTitle>Certification Bodies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Professional certification organizations trust AssessAI for 
                  secure, scalable, and reliable assessment delivery.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="p-12 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl mb-4">
                Ready to Transform Your Assessments?
              </CardTitle>
              <CardDescription className="text-xl">
                Join thousands of educators and organizations who trust AssessAI 
                for their assessment needs. Start your free trial today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button size="lg" asChild className="text-lg px-8 py-6">
                  <Link to="/auth">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  Contact Sales
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                No credit card required • 14-day free trial • Full feature access
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default HomePage;