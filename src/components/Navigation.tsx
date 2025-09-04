import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationSystem";
import { 
  Menu, 
  X, 
  BookOpen, 
  Plus, 
  Activity, 
  Shield, 
  BarChart3, 
  Brain,
  Home,
  Settings,
  Accessibility,
  LogOut,
  User
} from "lucide-react";
import AccessibilityControls from "./AccessibilityControls";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Fixed: Restore real auth context
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Assessments", href: "/assessments", icon: BookOpen },
    { name: "Create", href: "/assessments/create", icon: Plus },
    { name: "Monitor", href: "/monitoring", icon: Activity },
    { name: "Proctoring", href: "/proctoring", icon: Shield },
    { name: "Analytics", href: "/advanced-analytics", icon: BarChart3 },
    { name: "Admin", href: "/admin", icon: Settings },
  ];

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
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              
              // Show all features for demo/onboarding purposes
              // In production, you might want to enable this filtering:
              // if ((link.href === '/admin' || link.href === '/monitoring' || link.href === '/proctoring' || link.href === '/advanced-analytics') 
              //     && profile?.role !== 'admin' && profile?.role !== 'instructor') {
              //   return null;
              // }
              
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive(link.href)
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
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

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent ${
                      isActive(link.href)
                        ? "text-primary bg-accent"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="justify-start gap-2">
                    <Accessibility className="w-4 h-4" />
                    Accessibility
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <AccessibilityControls />
                </PopoverContent>
              </Popover>
              {user ? (
                <Button variant="ghost" size="sm" className="justify-start" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="justify-start" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                  <Button size="sm" className="justify-start" onClick={() => navigate('/auth')}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;