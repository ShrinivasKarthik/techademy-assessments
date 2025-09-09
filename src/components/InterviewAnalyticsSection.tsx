import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import InterviewAnalyticsDashboard from "@/components/interview/InterviewAnalyticsDashboard";
import ConversationIntelligenceEngine from "@/components/interview/ConversationIntelligenceEngine";
import { MessageSquare, BarChart3, Brain, TrendingUp } from 'lucide-react';

interface InterviewAnalyticsSectionProps {
  assessmentId?: string;
  instanceId?: string;
}

const InterviewAnalyticsSection: React.FC<InterviewAnalyticsSectionProps> = ({
  assessmentId,
  instanceId
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviewSession = async () => {
      if (!instanceId) return;

      try {
        const { data, error } = await supabase
          .from('interview_sessions')
          .select('id')
          .eq('instance_id', instanceId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching interview session:', error);
        } else if (data) {
          setSessionId(data.id);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewSession();
  }, [instanceId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading interview analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Interview Data</h3>
          <p className="text-muted-foreground">
            This assessment did not include interview questions or the interview session data is not available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Interview Intelligence & Analytics
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Analytics
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Conversation Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <InterviewAnalyticsDashboard sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="intelligence">
          <ConversationIntelligenceEngine sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewAnalyticsSection;