import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import InstructorDashboard from './InstructorDashboard';
import StudentDashboard from './StudentDashboard';
import MainDashboard from './MainDashboard';

const RoleBasedDashboard: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <MainDashboard />;
  }

  switch (profile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'instructor':
      return <InstructorDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <MainDashboard />;
  }
};

export default RoleBasedDashboard;