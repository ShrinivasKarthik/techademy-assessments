import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Code, 
  FileText, 
  Upload, 
  Mic, 
  CheckCircle, 
  Zap, 
  Shield, 
  BarChart3,
  Users,
  Globe,
  Cpu
} from "lucide-react";

const FeaturesSection = () => {
  const assessmentFeatures = [
    {
      icon: Code,
      title: "Smart Code Assessment",
      description: "Multi-language code editor with AI compilation simulation, syntax checking, and browser preview for web technologies.",
      features: ["Real-time syntax highlighting", "AI-powered code evaluation", "Browser preview simulation", "Multi-file project support"]
    },
    {
      icon: CheckCircle,
      title: "Intelligent MCQs",
      description: "Advanced multiple choice with randomization, negative marking, and AI-generated distractors for comprehensive testing.",
      features: ["Question randomization", "Negative marking system", "AI-generated options", "Adaptive difficulty"]
    },
    {
      icon: FileText,
      title: "Subjective Analysis",
      description: "Rich text editor with AI-powered semantic analysis, plagiarism detection, and comprehensive rubric scoring.",
      features: ["Semantic content analysis", "Plagiarism detection", "Rubric-based scoring", "Writing quality assessment"]
    },
    {
      icon: Upload,
      title: "File Intelligence",
      description: "Upload PDFs, spreadsheets, and designs for AI analysis of structure, formulas, and presentation quality.",
      features: ["Multi-format support", "Structure analysis", "Formula validation", "Design assessment"]
    },
    {
      icon: Mic,
      title: "Audio Evaluation",
      description: "Speech-to-text transcription with AI analysis of tone, fluency, confidence, and communication effectiveness.",
      features: ["Speech transcription", "Tone analysis", "Fluency scoring", "Communication assessment"]
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive reporting with skill progression tracking, cohort analysis, and AI-powered learning recommendations.",
      features: ["Individual progress tracking", "Cohort comparisons", "Skill gap analysis", "Learning path suggestions"]
    }
  ];

  const platformFeatures = [
    {
      icon: Brain,
      title: "AI-Native Architecture",
      description: "Pure AI evaluation without containers or runtimes",
      color: "primary"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant feedback and real-time assessment processing",
      color: "warning"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Role-based access with comprehensive audit trails",
      color: "success"
    },
    {
      icon: Users,
      title: "Scalable Platform",
      description: "From small teams to enterprise-wide deployments",
      color: "info"
    },
    {
      icon: Globe,
      title: "API Integration",
      description: "REST APIs and webhooks for seamless LMS integration",
      color: "primary"
    },
    {
      icon: Cpu,
      title: "Modular Design",
      description: "Flexible architecture with independent components",
      color: "success"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      primary: 'bg-primary/10 text-primary border-primary/20',
      success: 'bg-success/10 text-success border-success/20',
      info: 'bg-info/10 text-info border-info/20',
      warning: 'bg-warning/10 text-warning border-warning/20'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background-secondary/50 to-background">
      <div className="container mx-auto px-4">
        {/* Assessment Types */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Assessment Capabilities</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comprehensive Assessment Suite
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            From coding challenges to subjective essays, our AI evaluates every type of assessment 
            with human-like understanding and instant feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {assessmentFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-medium transition-all border-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {feature.features.map((feat, featIndex) => (
                      <li key={featIndex} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Platform Features */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Platform Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise-Grade Infrastructure
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Built for scale, security, and seamless integration with your existing educational 
            and enterprise systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="group hover:shadow-medium transition-all border-primary/10">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${getColorClasses(feature.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;