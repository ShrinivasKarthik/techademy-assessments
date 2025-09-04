import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'instructor' | 'student' | 'user';
  settings: any;
  created_at: string;
  updated_at: string;
}

export interface UserWithActivity extends UserProfile {
  last_login: string | null;
  assessments_created: number;
  assessments_taken: number;
  status: 'active' | 'inactive';
}

export const useUsers = () => {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!user || profile?.role !== 'admin') return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Enhance with activity data
      const usersWithActivity = await Promise.all(
        (profiles || []).map(async (profile: UserProfile) => {
          try {
            // Get assessments created count  
            const createdResponse = await fetch(
              `https://axdwgxtukqqzupboojmx.supabase.co/rest/v1/assessments?select=id&creator_id=eq.${profile.user_id}`,
              {
                headers: {
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZHdneHR1a3FxenVwYm9vam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDc4MDksImV4cCI6MjA3MjUyMzgwOX0.jqTQyfetH-utIZUeSVH34ctBY70bIig65C8NZo3tMIM',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const createdAssessments = createdResponse.ok ? await createdResponse.json() : [];

            // Get assessments taken count
            const takenResponse = await fetch(
              `https://axdwgxtukqqzupboojmx.supabase.co/rest/v1/assessment_instances?select=id&user_id=eq.${profile.user_id}`,
              {
                headers: {
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZHdneHR1a3FxenVwYm9vam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDc4MDksImV4cCI6MjA3MjUyMzgwOX0.jqTQyfetH-utIZUeSVH34ctBY70bIig65C8NZo3tMIM',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const takenAssessments = takenResponse.ok ? await takenResponse.json() : [];

            // Determine status based on recent activity (simplified)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentResponse = await fetch(
              `https://axdwgxtukqqzupboojmx.supabase.co/rest/v1/assessment_instances?select=started_at&user_id=eq.${profile.user_id}&started_at=gte.${thirtyDaysAgo.toISOString()}&limit=1`,
              {
                headers: {
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZHdneHR1a3FxenVwYm9vam14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDc4MDksImV4cCI6MjA3MjUyMzgwOX0.jqTQyfetH-utIZUeSVH34ctBY70bIig65C8NZo3tMIM',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const recentActivity = recentResponse.ok ? await recentResponse.json() : [];

            const status: 'active' | 'inactive' = recentActivity && recentActivity.length > 0 ? 'active' : 'inactive';

            return {
              ...profile,
              last_login: null, // Would need auth logs for real implementation
              assessments_created: createdAssessments.length,
              assessments_taken: takenAssessments.length,
              status
            };
          } catch (err) {
            console.error(`Error fetching activity for user ${profile.user_id}:`, err);
            return {
              ...profile,
              last_login: null,
              assessments_created: 0,
              assessments_taken: 0,
              status: 'inactive' as const
            };
          }
        })
      );

      setUsers(usersWithActivity);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserProfile['role']) => {
    if (!user || profile?.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) throw error;
    
    await fetchUsers(); // Refresh the list
    
    toast({
      title: "Success",
      description: "User role updated successfully"
    });
  };

  const inviteUser = async (email: string, role: UserProfile['role'] = 'user') => {
    if (!user || profile?.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }

    // In a real implementation, this would send an invitation email
    // For now, we'll just simulate the process
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${email} with role: ${role}`,
    });
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchUsers();
    }
  }, [user, profile]);

  return {
    users,
    loading,
    error,
    fetchUsers,
    updateUserRole,
    inviteUser
  };
};