import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  Code, 
  Users, 
  Shield, 
  BarChart3, 
  Activity,
  BookOpen,
  Plus,
  Settings,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  Mic,
  FileText,
  Upload,
  Eye,
  Play
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: string[];
  demoPath: string;
  color: string;
  phase: number;
}

const UserOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'assessment-creation',
      title: 'AI-Powered Assessment Creation',
      description: 'Create comprehensive assessments with AI assistance across multiple question types',
      icon: Brain,
      features: [
        'AI Content Generation for all question types',
        'Coding Questions with Monaco Editor',
        'MCQ, Subjective, File Upload, and Audio questions',
        'Automated rubric generation',
        'Smart difficulty adjustment'
      ],
      demoPath: '/assessments/create',
      color: 'primary',
      phase: 1
    },
    {
      id: 'assessment-management',
      title: 'Assessment Library & Management',
      description: 'Manage your assessment collection with powerful organizational tools',
      icon: BookOpen,
      features: [
        'Assessment library with search and filters',
        'Preview and edit existing assessments',
        'Bulk operations and status management',
        'Assessment analytics and insights',
        'Version control and templates'
      ],
      demoPath: '/assessments',
      color: 'info',
      phase: 2
    },
    {
      id: 'live-monitoring',
      title: 'Real-Time Assessment Monitoring',
      description: 'Monitor ongoing assessments with live tracking and intervention capabilities',
      icon: Activity,
      features: [
        'Live participant tracking',
        'Real-time progress monitoring',
        'Performance analytics dashboard',
        'Intervention alerts and notifications',
        'Session recording and playback'
      ],
      demoPath: '/monitoring',
      color: 'warning',
      phase: 3
    },
    {
      id: 'proctoring',
      title: 'Advanced Proctoring System',
      description: 'Secure assessment environment with AI-powered monitoring',
      icon: Shield,
      features: [
        'AI-powered cheating detection',
        'Face recognition and verification',
        'Screen monitoring and recording',
        'Suspicious behavior alerts',
        'Comprehensive integrity reports'
      ],
      demoPath: '/proctoring',
      color: 'destructive',
      phase: 4
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics & Reporting',
      description: 'Deep insights into assessment performance and learning outcomes',
      icon: BarChart3,
      features: [
        'Comprehensive performance analytics',
        'Learning outcome tracking',
        'Comparative analysis and benchmarking',
        'Custom report generation',
        'Data export and integration'
      ],
      demoPath: '/advanced-analytics',
      color: 'success',
      phase: 5
    },
    {
      id: 'admin',
      title: 'System Administration',
      description: 'Complete platform management with user and system controls',
      icon: Settings,
      features: [
        'User management and role assignment',
        'System health monitoring',
        'Platform configuration',
        'Security and compliance tools',
        'Integration management'
      ],
      demoPath: '/admin',
      color: 'secondary',
      phase: 6
    }
  ];

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTryFeature = () => {
    if (!completedSteps.includes(currentStepData.id)) {
      setCompletedSteps([...completedSteps, currentStepData.id]);
    }
    navigate(currentStepData.demoPath);
  };

  const handleSkipOnboarding = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Welcome to AssessAI</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Discover the power of AI-driven assessment platform
          </p>
          <div className="mt-4">
            <Progress value={progress} className="w-full max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStep + 1} of {onboardingSteps.length}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-lg bg-${currentStepData.color}/10`}>
                <currentStepData.icon className={`w-8 h-8 text-${currentStepData.color}`} />
              </div>
              <div>
                <Badge variant="outline">Phase {currentStepData.phase}</Badge>
                <CardTitle className="text-2xl mt-2">{currentStepData.title}</CardTitle>
              </div>
            </div>
            <p className="text-muted-foreground text-lg">
              {currentStepData.description}
            </p>
          </CardHeader>
          <CardContent>
            {/* Features List */}
            <div className="mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Key Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentStepData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button onClick={handleNext} disabled={currentStep === onboardingSteps.length - 1}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleSkipOnboarding}>
                  Skip Tour
                </Button>
                <Button onClick={handleTryFeature} className="gap-2">
                  <Play className="w-4 h-4" />
                  Try This Feature
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {onboardingSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = index === currentStep;
            
            return (
              <Card 
                key={step.id} 
                className={`cursor-pointer transition-all ${
                  isCurrent ? 'ring-2 ring-primary' : ''
                } ${isCompleted ? 'bg-success/5 border-success' : ''}`}
                onClick={() => setCurrentStep(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-${step.color}/10`}>
                      <Icon className={`w-5 h-5 text-${step.color}`} />
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        Phase {step.phase}
                      </Badge>
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-success ml-2 inline" />
                      )}
                    </div>
                  </div>
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="text-center">
          <Button variant="outline" onClick={handleSkipOnboarding} className="mr-4">
            <Eye className="w-4 h-4 mr-2" />
            Explore Dashboard
          </Button>
          <Button onClick={() => navigate('/auth')}>
            <Users className="w-4 h-4 mr-2" />
            Get Started with Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserOnboarding;