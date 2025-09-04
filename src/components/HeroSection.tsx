import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  Code, 
  CheckCircle, 
  Zap, 
  Shield, 
  Sparkles,
  ArrowRight,
  Play
} from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-background-secondary">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container mx-auto px-4 py-20 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Badge */}
          <Badge 
            variant="secondary" 
            className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Assessment Platform
          </Badge>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-info bg-clip-text text-transparent leading-tight">
            Intelligent
            <br />
            Assessment Platform
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Revolutionize testing with AI-native evaluation. From coding challenges to subjective responses, 
            our platform provides instant, comprehensive feedback without containers or human scoring.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary-dark text-primary-foreground shadow-medium hover:shadow-strong transition-all"
              onClick={() => navigate('/assessments')}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Assessment
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-primary/30 hover:bg-primary/10 hover:border-primary transition-all"
              onClick={() => navigate('/assessments/create')}
            >
              View Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card className="border-primary/20 shadow-soft hover:shadow-medium transition-all bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI-Native Evaluation</h3>
                <p className="text-muted-foreground text-sm">
                  No containers or runtimes. Pure AI evaluation with instant feedback and comprehensive scoring.
                </p>
              </CardContent>
            </Card>

            <Card className="border-success/20 shadow-soft hover:shadow-medium transition-all bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Code className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Multi-Format Support</h3>
                <p className="text-muted-foreground text-sm">
                  Coding, MCQs, subjective responses, file uploads, and audio assessments in one platform.
                </p>
              </CardContent>
            </Card>

            <Card className="border-info/20 shadow-soft hover:shadow-medium transition-all bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-info" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Enterprise Ready</h3>
                <p className="text-muted-foreground text-sm">
                  Scalable infrastructure, role-based access, and comprehensive analytics for organizations.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 mt-16 opacity-60">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-info" />
              <span className="text-sm font-medium">AI-Powered</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;