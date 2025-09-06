import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationSystem";
import { 
  BarChart3, 
  Users, 
  Settings, 
  FileText, 
  Database, 
  Activity, 
  TrendingUp, 
  Gauge, 
  Clock, 
  Shield, 
  MessageSquare, 
  Zap, 
  Eye,
  User,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  Brain,
  HelpCircle,
  Accessibility,
  Plus,
  CheckCircle,
  BookOpen,
  Home,
  MonitorSpeaker,
  Target,
  Globe
} from 'lucide-react';
import AccessibilityControls from "./AccessibilityControls";
import MobileNavigationDrawer from "./mobile/MobileNavigationDrawer";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Fixed: Restore real auth context
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // The navigation will be handled by the auth state change in AuthContext
    } catch (error) {
      console.error('Sign out error:', error);
      // Force navigation on error
      navigate('/auth');
    }
  };

  const isActive = (path: string) => {
    // Special handling for assessment routes
    if (path === "/assessments/create") {
      return location.pathname === "/assessments/create" && !location.search.includes('edit=');
    }
    
    // Check if we're in edit mode
    if (location.pathname.includes('/edit')) {
      return path === "/assessments/create"; // Treat edit as part of create workflow for nav highlighting
    }
    
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavigationStructure = () => {
    const baseLinks = [
      { name: "Dashboard", href: "/", icon: Home },
      { name: "Assessments", href: "/assessments", icon: BookOpen },
      { name: "Question Bank", href: "/question-bank", icon: Brain },
    ];

    const navigationGroups = [];

    switch (profile?.role) {
      case 'admin':
        navigationGroups.push(
          {
            name: "Assessments",
            icon: BookOpen,
            items: [
              { name: "Create Assessment", href: "/assessments/create", icon: Plus },
              { name: "Smart Assembly", href: "/smart-assembly", icon: Brain },
              { name: "Advanced Builder", href: "/advanced-builder", icon: Settings },
              { name: "Collaborative", href: "/collaborative", icon: Users }
            ]
          },
          {
            name: "Analytics",
            icon: BarChart3,
            items: [
              { name: "Advanced Analytics", href: "/advanced-analytics", icon: BarChart3 },
              { name: "Predictive Analytics", href: "/predictive-analytics", icon: Brain },
              { name: "Learning Paths", href: "/learning-paths", icon: TrendingUp },
              { name: "Cohort Analysis", href: "/cohort-analysis", icon: BarChart3 },
              { name: "Skills Analytics", href: "/skills-analytics", icon: TrendingUp }
            ]
          },
          {
            name: "Monitoring",
            icon: MonitorSpeaker,
            items: [
              { name: "Live Monitoring", href: "/monitoring", icon: Activity },
              { name: "Real-Time", href: "/monitoring/real-time", icon: Activity },
              { name: "Queue Monitor", href: "/queue-monitoring", icon: Database },
              { name: "Performance", href: "/performance-metrics", icon: TrendingUp },
              { name: "DB Performance", href: "/performance", icon: Database }
            ]
          },
          {
            name: "Quality & Reports",
            icon: Shield,
            items: [
              { name: "Question Quality", href: "/question-quality", icon: CheckCircle },
              { name: "Reports", href: "/reports", icon: BarChart3 },
              { name: "Comprehensive", href: "/comprehensive-reports", icon: FileText },
              { name: "Proctoring", href: "/proctoring", icon: Shield },
              { name: "Fraud Detection", href: "/fraud-detection", icon: Shield }
            ]
          },
          {
            name: "Admin",
            icon: Settings,
            items: [
              { name: "Admin Dashboard", href: "/admin", icon: Settings },
              { name: "Integrations", href: "/integrations", icon: Globe },
              { name: "Accessibility", href: "/accessibility", icon: Accessibility },
              { name: "Help", href: "/help", icon: HelpCircle }
            ]
          }
        );
        break;

      case 'instructor':
        navigationGroups.push(
          {
            name: "Assessments",
            icon: BookOpen,
            items: [
              { name: "Create Assessment", href: "/assessments/create", icon: Plus },
              { name: "Smart Assembly", href: "/smart-assembly", icon: Brain },
              { name: "Advanced Builder", href: "/advanced-builder", icon: Settings },
              { name: "Collaborative", href: "/collaborative", icon: Users }
            ]
          },
          {
            name: "Analytics",
            icon: BarChart3,
            items: [
              { name: "Advanced Analytics", href: "/advanced-analytics", icon: BarChart3 },
              { name: "Predictive Analytics", href: "/predictive-analytics", icon: Brain },
              { name: "Learning Paths", href: "/learning-paths", icon: TrendingUp },
              { name: "Cohort Analysis", href: "/cohort-analysis", icon: BarChart3 },
              { name: "Skills Analytics", href: "/skills-analytics", icon: TrendingUp }
            ]
          },
          {
            name: "Monitoring",
            icon: MonitorSpeaker,
            items: [
              { name: "Live Monitoring", href: "/monitoring", icon: Activity },
              { name: "Real-Time", href: "/monitoring/real-time", icon: Activity },
              { name: "Performance", href: "/performance-metrics", icon: TrendingUp }
            ]
          },
          {
            name: "Quality & Reports",
            icon: Shield,
            items: [
              { name: "Question Quality", href: "/question-quality", icon: CheckCircle },
              { name: "Reports", href: "/reports", icon: BarChart3 },
              { name: "Comprehensive", href: "/comprehensive-reports", icon: FileText },
              { name: "Proctoring", href: "/proctoring", icon: Shield },
              { name: "Fraud Detection", href: "/fraud-detection", icon: Shield }
            ]
          }
        );
        navigationGroups.push(
          { name: "Help", href: "/help", icon: HelpCircle }
        );
        break;

      case 'student':
        // Students only see basic navigation
        break;

      default:
        // Show simplified for demo purposes when no specific role
        navigationGroups.push(
          {
            name: "Tools",
            icon: Settings,
            items: [
              { name: "Create Assessment", href: "/assessments/create", icon: Plus },
              { name: "Smart Assembly", href: "/smart-assembly", icon: Brain },
              { name: "Analytics", href: "/advanced-analytics", icon: BarChart3 },
              { name: "Help", href: "/help", icon: HelpCircle }
            ]
          }
        );
    }

    return { baseLinks, navigationGroups };
  };

  const { baseLinks, navigationGroups } = getNavigationStructure();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">AssessAI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-hidden">
            {/* Base Links */}
            {baseLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:text-primary hover:bg-accent/50 ${
                    isActive(link.href)
                      ? "text-primary bg-accent"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}

            {/* Grouped Navigation Dropdowns */}
            {navigationGroups.map((group) => {
              if (group.href) {
                // Single link group
                const Icon = group.icon;
                return (
                  <Link
                    key={group.name}
                    to={group.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:text-primary hover:bg-accent/50 ${
                      isActive(group.href)
                        ? "text-primary bg-accent"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {group.name}
                  </Link>
                );
              }

              // Dropdown group
              const Icon = group.icon;
              const hasActiveItem = group.items.some(item => isActive(item.href));
              
              return (
                <DropdownMenu key={group.name}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:text-primary hover:bg-accent/50 ${
                        hasActiveItem
                          ? "text-primary bg-accent"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {group.name}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur border shadow-lg">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer ${
                              isActive(item.href)
                                ? "bg-accent text-accent-foreground"
                                : ""
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                            {item.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Accessibility className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <AccessibilityControls />
              </PopoverContent>
            </Popover>
            
            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                        <AvatarFallback>
                          {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {profile?.role || 'user'}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/auth')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Navigation Drawer */}
          <MobileNavigationDrawer />
        </div>

      </div>
    </header>
  );
};

export default Navigation;