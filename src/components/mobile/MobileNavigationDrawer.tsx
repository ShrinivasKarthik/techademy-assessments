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
  Database,
  Plus,
  CheckCircle,
  HelpCircle,
  Accessibility,
  MonitorSpeaker
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
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  const getNavigationSections = (): NavigationSection[] => {
    const baseSections: NavigationSection[] = [
      {
        title: "Main",
        items: [
          { title: "Dashboard", href: "/", icon: Home },
          { title: "Assessments", href: "/assessments", icon: BookOpen },
          { title: "Question Bank", href: "/question-bank", icon: Brain }
        ]
      }
    ];

    const roleSpecificSections: NavigationSection[] = [];

    switch (profile?.role) {
      case 'admin':
        roleSpecificSections.push(
          {
            title: "Assessment Tools",
            items: [
              { title: "Create Assessment", href: "/assessments/create", icon: Plus },
              { title: "Smart Assembly", href: "/smart-assembly", icon: Brain },
              { title: "Advanced Builder", href: "/advanced-builder", icon: Settings },
              { title: "Collaborative", href: "/collaborative", icon: Users }
            ]
          },
          {
            title: "Analytics & AI",
            items: [
              { title: "Advanced Analytics", href: "/advanced-analytics", icon: BarChart3 },
              { title: "Predictive Analytics", href: "/predictive-analytics", icon: TrendingUp, badge: "AI" },
              { title: "Learning Paths", href: "/learning-paths", icon: Target, badge: "AI" },
              { title: "Cohort Analysis", href: "/cohort-analysis", icon: BarChart3 },
              { title: "Skills Analytics", href: "/skills-analytics", icon: TrendingUp }
            ]
          },
          {
            title: "Monitoring",
            items: [
              { title: "Live Monitoring", href: "/monitoring", icon: MonitorSpeaker },
              { title: "Real-time", href: "/monitoring/real-time", icon: Activity },
              { title: "Queue Monitor", href: "/queue-monitoring", icon: Database },
              { title: "Performance", href: "/performance-metrics", icon: TrendingUp },
              { title: "DB Performance", href: "/performance", icon: Database }
            ]
          },
          {
            title: "Quality & Security",
            items: [
              { title: "Question Quality", href: "/question-quality", icon: CheckCircle },
              { title: "Fraud Detection", href: "/fraud-detection", icon: Shield },
              { title: "Proctoring", href: "/proctoring", icon: Shield }
            ]
          },
          {
            title: "Reports",
            items: [
              { title: "Reports", href: "/reports", icon: BarChart3 },
              { title: "Comprehensive", href: "/comprehensive-reports", icon: FileText }
            ]
          },
          {
            title: "Administration",
            items: [
              { title: "Admin Dashboard", href: "/admin", icon: Settings },
              { title: "Integrations", href: "/integrations", icon: Globe },
              { title: "Accessibility", href: "/accessibility", icon: Accessibility },
              { title: "Help", href: "/help", icon: HelpCircle }
            ]
          }
        );
        break;

      case 'instructor':
        roleSpecificSections.push(
          {
            title: "Assessment Tools",
            items: [
              { title: "Create Assessment", href: "/assessments/create", icon: Plus },
              { title: "Smart Assembly", href: "/smart-assembly", icon: Brain },
              { title: "Advanced Builder", href: "/advanced-builder", icon: Settings },
              { title: "Collaborative", href: "/collaborative", icon: Users }
            ]
          },
          {
            title: "Analytics & AI",
            items: [
              { title: "Advanced Analytics", href: "/advanced-analytics", icon: BarChart3 },
              { title: "Predictive Analytics", href: "/predictive-analytics", icon: TrendingUp, badge: "AI" },
              { title: "Learning Paths", href: "/learning-paths", icon: Target, badge: "AI" },
              { title: "Cohort Analysis", href: "/cohort-analysis", icon: BarChart3 },
              { title: "Skills Analytics", href: "/skills-analytics", icon: TrendingUp }
            ]
          },
          {
            title: "Monitoring & Quality",
            items: [
              { title: "Live Monitoring", href: "/monitoring", icon: MonitorSpeaker },
              { title: "Real-time", href: "/monitoring/real-time", icon: Activity },
              { title: "Question Quality", href: "/question-quality", icon: CheckCircle },
              { title: "Fraud Detection", href: "/fraud-detection", icon: Shield },
              { title: "Proctoring", href: "/proctoring", icon: Shield }
            ]
          },
          {
            title: "Reports & Help",
            items: [
              { title: "Reports", href: "/reports", icon: BarChart3 },
              { title: "Comprehensive", href: "/comprehensive-reports", icon: FileText },
              { title: "Performance", href: "/performance-metrics", icon: TrendingUp },
              { title: "Help", href: "/help", icon: HelpCircle }
            ]
          }
        );
        break;

      case 'student':
        // Students get minimal navigation in mobile
        break;

      default:
        // Simplified for demo
        roleSpecificSections.push(
          {
            title: "Tools",
            items: [
              { title: "Create Assessment", href: "/assessments/create", icon: Plus },
              { title: "Smart Assembly", href: "/smart-assembly", icon: Brain },
              { title: "Analytics", href: "/advanced-analytics", icon: BarChart3 },
              { title: "Help", href: "/help", icon: HelpCircle }
            ]
          }
        );
    }

    return [...baseSections, ...roleSpecificSections];
  };

  const navigationSections = getNavigationSections();

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
      <SheetContent side="left" className="w-80 overflow-y-auto bg-background/95 backdrop-blur">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AssessAI
          </SheetTitle>
          {user && (
            <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg border">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role || 'user'}</p>
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