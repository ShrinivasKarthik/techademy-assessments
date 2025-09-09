import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import ConversationIntelligenceEngine from "@/components/interview/ConversationIntelligenceEngine";
import { ArrowLeft, Brain } from 'lucide-react';

const ConversationIntelligencePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Invalid Session</h2>
              <p className="text-muted-foreground mb-4">No interview session ID provided.</p>
              <Button onClick={() => navigate('/assessments')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assessments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Brain className="w-8 h-8" />
            Conversation Intelligence
          </h1>
          <p className="text-muted-foreground">
            AI-powered analysis of conversation patterns, skills demonstration, and communication insights.
          </p>
        </div>

        <ConversationIntelligenceEngine sessionId={sessionId} />
      </div>
    </div>
  );
};

export default ConversationIntelligencePage;