import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, MessageCircle, Clock, User, Bot, Volume2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useInterviewWebSocket } from '@/hooks/useInterviewWebSocket';
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

const StableInterviewQuestion: React.FC<InterviewQuestionProps> = ({
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const config = question.config || {};
  const interviewType = config.interview_type || 'behavioral';
  const duration = config.duration_minutes || 30;
  
  // WebSocket connection
  const { 
    isConnected, 
    sessionReady,
    lastMessage, 
    connectionState,
    sendMessage: sendWebSocketMessage,
    retry: retryConnection
  } = useInterviewWebSocket(sessionId || undefined);

  // Audio processing
  const { 
    isRecording, 
    isProcessing, 
    hasPermission, 
    requestPermissions,
    startRecording, 
    stopRecording, 
    convertBlobToBase64,
    cleanup: cleanupAudio 
  } = useEnhancedAudioProcessing();

  // Initialize session on component mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('Initializing interview session...');
        
        const { data, error } = await supabase
          .from('interview_sessions')
          .insert({
            question_id: question.id,
            instance_id: instanceId,
            current_state: 'initializing'
          })
          .select()
          .single();

        if (error) throw error;

        console.log('Session created:', data.id);
        setSessionId(data.id);
        
        // Add initial AI message
        const initialMessage: Message = {
          speaker: 'assistant',
          content: `Hello! Welcome to your ${interviewType} interview. ${config.instructions || 'I\'m ready to begin when you are. You can respond using text or voice.'} How are you doing today?`,
          timestamp: new Date(),
          type: 'text'
        };
        
        setMessages([initialMessage]);

      } catch (error) {
        console.error('Failed to initialize session:', error);
        toast({
          title: "Session Error",
          description: "Failed to start interview session. Please refresh and try again.",
          variant: "destructive",
        });
      }
    };

    initializeSession();
  }, [question.id, instanceId, interviewType, config.instructions, toast]);

  // Timer for elapsed time
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    console.log('Processing WebSocket message:', lastMessage.type, lastMessage);
    
    if (lastMessage.type === 'ai_response') {
      console.log('Received AI response:', lastMessage.data.content);
      const aiMessage: Message = {
        speaker: 'assistant',
        content: lastMessage.data.content,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      
      // Show transcription if present
      if (lastMessage.data.transcription && mode === 'voice') {
        console.log('Updating user message with transcription:', lastMessage.data.transcription);
        // Update the last user message with the actual transcription
        setMessages(prev => {
          const updated = [...prev];
          // Find the last user message and update it
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].speaker === 'user' && updated[i].type === 'audio') {
              updated[i] = { ...updated[i], content: lastMessage.data.transcription };
              break;
            }
          }
          return updated;
        });
      }
    }
    
    if (lastMessage.type === 'audio_response') {
      console.log('Received audio response, playing audio...');
      playAudioResponse(lastMessage.data.audio);
    }
    
  }, [lastMessage, mode, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || !sessionReady || isLoading) return;

    const userMessage: Message = {
      speaker: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    
    const success = sendWebSocketMessage({
      type: 'text_message',
      data: { message: currentMessage.trim() }
    });
    
    if (!success) {
      setIsLoading(false);
    }
  }, [currentMessage, sessionReady, isLoading, sendWebSocketMessage]);

  const handleVoiceRecord = useCallback(async () => {
    try {
      console.log('handleVoiceRecord called, isRecording:', isRecording, 'hasPermission:', hasPermission);
      
      if (!hasPermission) {
        console.log('Requesting permissions...');
        const granted = await requestPermissions();
        console.log('Permission granted:', granted);
        if (!granted) return;
      }

      if (isRecording) {
        console.log('Stopping recording...');
        setIsLoading(true);
        const audioBlob = await stopRecording();
        console.log('Recording stopped, blob size:', audioBlob?.size);
        
        if (audioBlob && audioBlob.size > 0) {
          console.log('Converting blob to base64...');
          const base64Audio = await convertBlobToBase64(audioBlob);
          console.log('Base64 audio length:', base64Audio?.length);
          
          const audioMessage: Message = {
            speaker: 'user',
            content: "Recording your voice...",
            timestamp: new Date(),
            type: 'audio'
          };
          
          setMessages(prev => [...prev, audioMessage]);
          
          console.log('Sending WebSocket message...');
          const success = sendWebSocketMessage({
            type: 'audio_message',
            data: { audio_data: base64Audio }
          });
          console.log('WebSocket send success:', success);
          
          if (!success) {
            setIsLoading(false);
          }
        } else {
          console.log('No audio data recorded');
          toast({
            title: "Recording Error",
            description: "No audio data recorded. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } else {
        console.log('Starting recording...');
        const success = await startRecording();
        console.log('Recording start success:', success);
        if (!success) {
          toast({
            title: "Recording Failed",
            description: "Could not start voice recording.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Voice recording error:', error);
      setIsLoading(false);
      toast({
        title: "Voice Error",
        description: "An error occurred with voice recording.",
        variant: "destructive",
      });
    }
  }, [hasPermission, requestPermissions, isRecording, stopRecording, startRecording, convertBlobToBase64, sendWebSocketMessage, toast]);

  const playAudioResponse = async (audioBase64: string) => {
    try {
      console.log('playAudioResponse called with base64 length:', audioBase64?.length);
      
      // Convert base64 to blob for MP3 playback
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('Created audio bytes, length:', bytes.length);
      
      // Create blob and play using HTML5 Audio
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      console.log('Created audio element, attempting to play...');
      
      audio.onended = () => {
        console.log('Audio playback ended');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      console.log('Audio playback started successfully');
    } catch (error) {
      console.error('Failed to play audio:', error);
      toast({
        title: "Audio Playback Error",
        description: "Could not play voice response.",
        variant: "destructive",
      });
    }
  };

  const completeInterview = useCallback(async () => {
    try {
      if (sessionId) {
        await supabase
          .from('interview_sessions')
          .update({
            current_state: 'completed',
            conversation_log: JSON.stringify(messages)
          })
          .eq('id', sessionId);

        cleanupAudio();
        
        toast({
          title: "Interview Complete",
          description: "Your interview has been completed successfully.",
        });

        // Trigger interview intelligence analysis
        try {
          toast({
            title: "Processing Interview",
            description: "Generating comprehensive analysis...",
          });

          await supabase.functions.invoke('trigger-interview-intelligence', {
            body: { sessionId }
          });
          
          console.log('Interview intelligence analysis triggered for session:', sessionId);
        } catch (analysisError) {
          console.error('Failed to trigger interview analysis:', analysisError);
          // Don't fail the completion if analysis fails
        }

        onComplete({
          sessionId,
          messages,
          duration: timeElapsed,
          type: interviewType
        });
      }
    } catch (error) {
      console.error('Error completing interview:', error);
      toast({
        title: "Completion Error",
        description: "Failed to complete interview.",
        variant: "destructive",
      });
    }
  }, [sessionId, messages, timeElapsed, interviewType, cleanupAudio, onComplete, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    if (!sessionReady) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getConnectionStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (!sessionReady) return 'Connecting...';
    return 'Connected';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[700px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{question.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className={`h-4 w-4 ${getConnectionStatusColor()}`} />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeElapsed)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('text')}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Text
          </Button>
          <Button
            variant={mode === 'voice' ? 'default' : 'outline'}
            size="sm"
            onClick={async () => {
              if (!hasPermission) {
                console.log('Requesting microphone permissions...');
                const granted = await requestPermissions();
                if (granted) {
                  setMode('voice');
                } else {
                  toast({
                    title: "Permission Required",
                    description: "Microphone access is needed for voice mode.",
                    variant: "destructive",
                  });
                }
              } else {
                setMode('voice');
              }
            }}
            title={!hasPermission ? 'Click to grant microphone permission' : 'Switch to voice mode'}
          >
            <Mic className="h-4 w-4 mr-1" />
            Voice {!hasPermission && '(Click to enable)'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.speaker === 'user'
                      ? 'bg-primary text-primary-foreground ml-4'
                      : 'bg-muted mr-4'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    {message.speaker === 'user' ? (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-xs opacity-70">
                      {message.speaker === 'user' ? 'You' : 'AI Interviewer'}
                    </span>
                    {message.type === 'audio' && (
                      <Volume2 className="h-3 w-3 ml-1 opacity-70" />
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <div className="text-xs opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg mr-4 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs opacity-70">AI Interviewer</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span className="text-sm">
                      {isProcessing ? 'Processing voice...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t pt-4">
          {mode === 'text' ? (
            <div className="flex gap-2">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!sessionReady || isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || !sessionReady || isLoading}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleVoiceRecord}
                disabled={!sessionReady || isLoading}
                variant={isRecording ? 'destructive' : 'default'}
                size="lg"
                className="w-32 h-32 rounded-full"
              >
                {isRecording ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {isRecording ? 'Click to stop recording' : 'Click to start recording'}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <Button
            variant="outline"
            onClick={retryConnection}
            disabled={isConnected}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
          
          <Button
            onClick={completeInterview}
            disabled={!sessionId}
          >
            Complete Interview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StableInterviewQuestion;