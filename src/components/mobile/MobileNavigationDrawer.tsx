import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Home, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  BookOpen,
  Target,
  Activity,
  Globe,
  Shield,
  Brain,
  Zap,
  TrendingUp,
  Database
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const MobileNavigationDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  const navigationSections: NavigationSection[] = [
    {
      title: "Main",
      items: [
        { title: "Dashboard", href: "/", icon: Home },
        { title: "Assessments", href: "/assessments", icon: FileText },
        { title: "Question Bank", href: "/question-bank", icon: BookOpen },
        { title: "Create Assessment", href: "/assessments/create", icon: Target }
      ]
    },
    {
      title: "Analytics & AI",
      items: [
        { title: "Advanced Analytics", href: "/advanced-analytics", icon: Brain },
        { title: "Predictive Analytics", href: "/predictive-analytics", icon: TrendingUp, badge: "New" },
        { title: "Learning Paths", href: "/learning-paths", icon: Target, badge: "New" },
        { title: "Fraud Detection", href: "/fraud-detection", icon: Shield, badge: "New" },
        { title: "Cohort Analysis", href: "/cohort-analysis", icon: BarChart3, badge: "New" },
        { title: "Performance Metrics", href: "/performance-metrics", icon: Zap },
        { title: "Skills Analytics", href: "/skills-analytics", icon: TrendingUp }
      ]
    },
    {
      title: "Advanced Features",
      items: [
        { title: "Smart Assembly", href: "/smart-assembly", icon: Zap },
        { title: "Advanced Builder", href: "/advanced-builder", icon: Settings },
        { title: "Collaborative", href: "/collaborative", icon: Users },
        { title: "Real-time Monitoring", href: "/monitoring/real-time", icon: Activity },
        { title: "Queue Monitoring", href: "/queue-monitoring", icon: Database }
      ]
    },
    {
      title: "Quality & Reports",
      items: [
        { title: "Question Quality", href: "/question-quality", icon: Shield },
        { title: "Advanced Reports", href: "/advanced-reports", icon: BarChart3 },
        { title: "Comprehensive Reports", href: "/comprehensive-reports", icon: FileText },
        { title: "Live Monitoring", href: "/monitoring", icon: Activity },
        { title: "Proctoring", href: "/proctoring", icon: Shield }
      ]
    },
    {
      title: "Tools",
      items: [
        { title: "Question Templates", href: "/question-templates", icon: FileText },
        { title: "Assessment Analytics", href: "/assessment-analytics", icon: BarChart3 },
        { title: "Question Analytics", href: "/question-analytics", icon: Activity }
      ]
    }
  ];

  const isActiveRoute = (href: string) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">AssessAI</SheetTitle>
          {user && (
            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
              {section !== navigationSections[navigationSections.length - 1] && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        {user && (
          <div className="mt-8 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileNavigationDrawer;