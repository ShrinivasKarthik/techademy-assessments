import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Plus, List, Brain } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">AssessmentPro</h1>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link 
                to="/assessments" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/assessments') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <List className="w-4 h-4 mr-2" />
                Assessments
              </Link>
              <Link 
                to="/assessments/create"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/assessments/create') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Link>
              <Link 
                to="/monitoring"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/monitoring') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Monitor
              </Link>
              <Link 
                to="/proctoring"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/proctoring') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Proctoring
              </Link>
              <Link 
                to="/advanced-analytics"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive('/advanced-analytics') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Analytics
              </Link>
              <Button variant="outline" size="sm">
                Sign In
              </Button>
              <Button size="sm">
                Get Started
              </Button>
            </div>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            <Link 
              to="/assessments" 
              className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/assessments') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <List className="w-4 h-4 mr-2" />
              Assessments
            </Link>
            <Link 
              to="/assessments/create" 
              className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${isActive('/assessments/create') ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Assessment
            </Link>
            <div className="pt-2 space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                Sign In
              </Button>
              <Button size="sm" className="w-full">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;