import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import InstructorDashboard from './InstructorDashboard';
import StudentDashboard from './StudentDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const RoleBasedDashboard: React.FC = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  // Use useEffect for navigation to avoid render-time side effects
  useEffect(() => {
    if (!loading) {
      if (profile?.role === 'user' || !profile?.role) {
        navigate('/auth');
      }
    }
  }, [loading, profile?.role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting
  if (profile?.role === 'user' || !profile?.role) {
    return null;
  }

  switch (profile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'instructor':
      return <InstructorDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return null;
  }
};

export default RoleBasedDashboard;