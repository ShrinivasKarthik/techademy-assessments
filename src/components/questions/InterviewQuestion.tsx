import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, MessageCircle, Clock, User, Bot, Volume2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InterviewVoiceAnalyzer from '@/components/interview/InterviewVoiceAnalyzer';
import InterviewSentimentTracker from '@/components/interview/InterviewSentimentTracker';
import { supabase } from '@/integrations/supabase/client';
import { useInterviewWebSocket } from '@/hooks/useInterviewWebSocket';
import { useInterviewSessionRecovery } from '@/hooks/useInterviewSessionRecovery';
import { useEnhancedAudioProcessing } from '@/hooks/useEnhancedAudioProcessing';

interface InterviewQuestionProps {
  question: {
    id: string;
    title: string;
    question_text?: string;
    config?: {
      interview_type?: 'technical' | 'behavioral' | 'situational';
      duration_minutes?: number;
      instructions?: string;
      evaluation_criteria?: string[];
    };
  };
  instanceId: string;
  onComplete: (answer: any) => void;
}

interface Message {
  speaker: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'audio';
}

const InterviewQuestion: React.FC<InterviewQuestionProps> = ({
  question,
  instanceId,
  onComplete,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [mode, setMode] = useState<'text' | 'voice'>('text');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enhanced hooks
  // Use dynamic WebSocket URL based on current location
  const wsUrl = `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/interview-bot`;
  
  const { 
    isConnected, 
    connectionState, 
    lastMessage, 
    sendMessage: sendWebSocketMessage,
    retry: retryConnection
  } = useInterviewWebSocket(sessionId || undefined, wsUrl);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Enhanced auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  const {
    canRecover,
    isRecovering,
    recoverSession,
    clearRecovery,
    checkForRecovery
  } = useInterviewSessionRecovery(question.id, instanceId);

  const audioProcessing = useEnhancedAudioProcessing();

  const { toast } = useToast();

  const config = question.config || {};
  const interviewType = config.interview_type || 'behavioral';
  const duration = config.duration_minutes || 30;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer
  useEffect(() => {
    if (sessionId) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initializeSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          question_id: question.id,
          instance_id: instanceId,
          current_state: 'intro',
          evaluation_criteria: {
            type: interviewType,
            duration_minutes: duration,
            criteria: config.evaluation_criteria || []
          }
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      
      // Add initial AI message
      const initialMessage: Message = {
        speaker: 'assistant',
        content: `Hello! Welcome to your ${interviewType} interview. ${config.instructions || 'Let me know when you\'re ready to begin, and we\'ll start with some questions.'} You can respond using text or voice - just toggle the mode below.`,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages([initialMessage]);

    } catch (error) {
      console.error('Failed to initialize session:', error);
      toast({
        title: "Session Error",
        description: "Failed to start interview session",
        variant: "destructive",
      });
    }
  }, [question.id, instanceId, interviewType, duration, config, toast]);

  // Check for recovery on mount and handle recovery flow
  useEffect(() => {
    const handleInitialLoad = async () => {
      const recoveryData = await checkForRecovery();
      if (recoveryData.canRecover) {
        toast({
          title: "Session Available",
          description: "Found an incomplete interview session. Would you like to continue?",
        });
      } else {
        // No recovery needed, initialize new session
        initializeSession();
      }
    };

    handleInitialLoad();
  }, [initializeSession, toast]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && sessionId) {
      console.log('Processing WebSocket message:', lastMessage);
      
      if (lastMessage.type === 'ai_response') {
        const aiMessage: Message = {
          speaker: 'assistant',
          content: lastMessage.data.content,
          timestamp: new Date(),
          type: 'text'
        };
        
        // Replace the processing placeholder or add new message
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.speaker === 'user' && lastMsg.content === '[Processing voice message...]') {
            // Update the processing message with actual transcription if available
            return [...prev.slice(0, -1), 
              { ...lastMsg, content: lastMessage.data.transcription || '[Voice message]', type: 'audio' },
              aiMessage
            ];
          }
          return [...prev, aiMessage];
        });
        
        saveMessage(aiMessage);
      } else if (lastMessage.type === 'audio_response') {
        // Handle audio playback
        playAudioResponse(lastMessage.data.audio);
      } else if (lastMessage.type === 'connection_confirmed') {
        console.log('WebSocket connection confirmed');
      } else if (lastMessage.type === 'session_initialized') {
        console.log('Session initialized:', lastMessage);
      } else if (lastMessage.type === 'error') {
        console.error('WebSocket error received:', lastMessage);
        toast({
          title: "Voice Error",
          description: lastMessage.error || "An error occurred with voice processing",
          variant: "destructive",
        });
      }
    }
  }, [lastMessage, sessionId, toast]);

  const saveMessage = async (message: Message) => {
    if (!sessionId) return;

    try {
      await supabase.from('interview_responses').insert({
        session_id: sessionId,
        speaker: message.speaker,
        message_type: message.type,
        content: message.content,
        metadata: { timestamp: message.timestamp.toISOString() }
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const sendTextMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      speaker: 'user',
      content: currentMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Save user message
      await saveMessage(userMessage);

      if (mode === 'voice' && isConnected) {
        // Send via WebSocket for voice mode
        sendWebSocketMessage({
          type: 'user_message',
          data: {
            content: currentMessage,
            session_id: sessionId
          }
        });
      } else {
        // Use direct API call for text mode
        const { data, error } = await supabase.functions.invoke('interview-bot', {
          body: {
            session_id: sessionId,
            message: currentMessage,
            interview_type: interviewType
          }
        });

        if (error) throw error;

        const aiResponse: Message = {
          speaker: 'assistant',
          content: data.response,
          timestamp: new Date(),
          type: 'text'
        };

        setMessages(prev => [...prev, aiResponse]);
        await saveMessage(aiResponse);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Message Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    if (!audioProcessing.hasPermission) {
      const granted = await audioProcessing.requestPermissions();
      if (!granted) return;
    }

    const success = await audioProcessing.startRecording();
    if (!success) {
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording...', { isConnected, sessionId });
    const audioBlob = await audioProcessing.stopRecording();
    
    if (!audioBlob) {
      console.error('No audio blob received from recording');
      toast({
        title: "Recording Error",
        description: "No audio data was recorded. Please try again.",
        variant: "destructive",
      });
      return;
    }

    console.log('Audio blob received:', { size: audioBlob.size, type: audioBlob.type });

    if (!isConnected) {
      console.error('WebSocket not connected');
      toast({
        title: "Connection Error",
        description: "Not connected to voice service. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64Audio = await audioProcessing.convertBlobToBase64(audioBlob);
      console.log('Sending audio message via WebSocket...');
      
      const success = sendWebSocketMessage({
        type: 'audio_message',
        data: {
          audio: base64Audio,
          session_id: sessionId
        }
      });

      if (success) {
        console.log('Audio message sent successfully');
        // Add user message placeholder while processing
        const userMessage: Message = {
          speaker: 'user',
          content: '[Processing voice message...]',
          timestamp: new Date(),
          type: 'audio'
        };
        setMessages(prev => [...prev, userMessage]);
      }
      
    } catch (error) {
      console.error('Failed to send audio:', error);
      toast({
        title: "Audio Error",
        description: `Failed to send audio message: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const playAudioResponse = async (audioBase64: string) => {
    try {
      const audioData = atob(audioBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioArray.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const completeInterview = async () => {
    try {
      if (sessionId) {
        // Update session with final state
        await supabase
          .from('interview_sessions')
          .update({
            current_state: 'completed',
            conversation_log: JSON.stringify(messages)
          })
          .eq('id', sessionId);

        // Auto-trigger comprehensive interview intelligence analysis
        toast({
          title: "Processing Interview",
          description: "Generating comprehensive analysis...",
        });

        try {
          await supabase.functions.invoke('interview-intelligence', {
            body: { session_id: sessionId }
          });
          
          toast({
            title: "Analysis Complete",
            description: "Interview insights have been generated",
          });
        } catch (analysisError) {
          console.error('Failed to generate interview analysis:', analysisError);
          // Don't block completion on analysis failure
        }
      }

      // Complete the question
      onComplete({
        session_id: sessionId,
        conversation_log: messages,
        duration_seconds: timeElapsed,
        interview_type: interviewType
      });

    } catch (error) {
      console.error('Failed to complete interview:', error);
      toast({
        title: "Completion Error",
        description: "Failed to complete interview",
        variant: "destructive",
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioProcessing.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioProcessing]);

  return (
    <div className="space-y-6">
      {/* Recovery Notice */}
      {canRecover && !sessionId && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-800">
                  You have an incomplete interview session. Would you like to resume?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearRecovery}
                  disabled={isRecovering}
                >
                  Start New
                </Button>
                <Button
                  size="sm"
                  onClick={recoverSession}
                  disabled={isRecovering}
                >
                  {isRecovering ? 'Resuming...' : 'Resume'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {question.title}
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant={interviewType === 'technical' ? 'default' : 'secondary'}>
                {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {formatTime(timeElapsed)} / {duration}m
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={mode === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('text')}
            className="rounded-md"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Text
          </Button>
          <Button
            variant={mode === 'voice' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('voice')}
            className="rounded-md"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Voice
            {mode === 'voice' && (
              <div className="flex items-center gap-1 ml-2">
                <Badge variant="outline" className="text-xs">
                  {connectionState === 'connected' ? 'Connected' : 
                   connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Badge>
                {connectionState === 'disconnected' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={retryConnection}
                    className="h-6 w-6 p-0 ml-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[500px] border rounded-lg p-4 mb-4 bg-muted/5" ref={scrollAreaRef}>
            <div className="space-y-4" id="messages-container">
              {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    message.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                    {message.speaker === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.speaker === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardContent className="p-4">
          {mode === 'text' ? (
            <div className="flex gap-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your response..."
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendTextMessage();
                  }
                }}
              />
              <Button
                onClick={sendTextMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="icon"
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={audioProcessing.isRecording ? stopRecording : startRecording}
                disabled={mode === 'voice' && !isConnected}
                size="lg"
                variant={audioProcessing.isRecording ? 'destructive' : 'default'}
                className={`w-20 h-20 rounded-full transition-all duration-300 ${
                  audioProcessing.isRecording 
                    ? 'bg-red-500 text-white shadow-lg scale-105 animate-pulse' 
                    : audioProcessing.isProcessing
                    ? 'bg-yellow-500 text-white'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {audioProcessing.isRecording ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {audioProcessing.isRecording ? 'Recording... Click to stop' : audioProcessing.isProcessing ? 'Processing...' : 'Click to start recording'}
                </p>
                {mode === 'voice' && !isConnected && (
                  <p className="text-xs text-red-500">
                    Voice service not connected
                  </p>
                )}
                {audioProcessing.audioLevel > 0 && (
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-100"
                      style={{ width: `${audioProcessing.audioLevel * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-Time Analysis Components */}
      {sessionId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InterviewVoiceAnalyzer 
            sessionId={sessionId}
            onMetricsUpdate={(metrics) => {
              console.log('Voice metrics updated:', metrics);
            }}
          />
          <InterviewSentimentTracker 
            sessionId={sessionId}
            onSentimentUpdate={(sentiment) => {
              console.log('Sentiment updated:', sentiment);
            }}
          />
        </div>
      )}

      {/* Complete Interview Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={completeInterview}
          variant="outline"
          className="min-w-[200px]"
        >
          Complete Interview
        </Button>
      </div>
    </div>
  );
};

export default InterviewQuestion;