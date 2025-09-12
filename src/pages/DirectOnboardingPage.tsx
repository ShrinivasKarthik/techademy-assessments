import React from 'react';
import DirectOnboarding from '@/components/DirectOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const DirectOnboardingPage = () => {
  const { profile, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (profile?.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <DirectOnboarding />
      </div>
    </div>
  );
};

export default DirectOnboardingPage;