import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Code, FileText, Mic, Upload, BarChart3, Settings, User } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border/40 shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none">AssessAI</span>
            <span className="text-xs text-muted-foreground">Intelligent Assessment Platform</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="gap-2">
            <Code className="w-4 h-4" />
            Coding
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Subjective
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Files
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Mic className="w-4 h-4" />
            Audio
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="hidden sm:flex">
            <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
            AI Online
          </Badge>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;