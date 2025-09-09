import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, MessageCircle, Clock, User, Bot, Volume2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useInterviewWebSocket } from '@/hooks/useInterviewWebSocket';
import { useInterviewSessionRecovery } from '@/hooks/useInterviewSessionRecovery';
import { useEnhancedAudioProcessing } from '@/hooks/useEnhancedAudioProcessing';
import { ErrorBoundary } from '@/components/ui/error-boundary';

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

// Memoized components for performance
const MessageBubble = memo(({ message, index }: { message: Message; index: number }) => (
  <div
    key={index}
    className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
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
));

const LoadingIndicator = memo(({ isProcessing }: { isProcessing: boolean }) => (
  <div className="flex justify-start mb-4">
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
));

const StableInterviewQuestion: React.FC<InterviewQuestionProps> = memo(({
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
  
  // Memoized configurations to prevent unnecessary re-renders
  const config = React.useMemo(() => question.config || {}, [question.config]);
  const interviewType = React.useMemo(() => config.interview_type || 'behavioral', [config.interview_type]);
  const duration = React.useMemo(() => config.duration_minutes || 30, [config.duration_minutes]);
  
  // Memoized WebSocket URL to prevent reconnections
  const wsUrl = React.useMemo(() => 
    `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/interview-bot`, 
    []
  );
  
  // Enhanced WebSocket with stability improvements
  const { 
    isConnected, 
    connectionState, 
    lastMessage, 
    sendMessage: sendWebSocketMessage,
    retry: retryConnection
  } = useInterviewWebSocket(sessionId || undefined, wsUrl);

  // Enhanced audio processing
  const { 
    isRecording, 
    isProcessing, 
    hasPermission, 
    audioLevel,
    requestPermissions,
    startRecording, 
    stopRecording, 
    convertBlobToBase64,
    cleanup: cleanupAudio 
  } = useEnhancedAudioProcessing();
  
  // Session recovery
  const { 
    canRecover,
    isRecovering,
    recoverSession,
    clearRecovery,
    checkForRecovery
  } = useInterviewSessionRecovery(question.id, instanceId);

  // Stable scroll function
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const timer = setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Initialize session
  const initializeSession = useCallback(async () => {
    try {
      console.log('Initializing interview session...');
      
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          question_id: question.id,
          instance_id: instanceId,
          interview_type: interviewType,
          duration_minutes: duration,
          current_state: 'active'
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

  // Handle initial load and recovery
  useEffect(() => {
    const handleInitialLoad = async () => {
      try {
        const recoveryData = await checkForRecovery();
        if (recoveryData.canRecover) {
          toast({
            title: "Session Available",
            description: "Found an incomplete interview session. Would you like to continue?",
          });
        } else {
          await initializeSession();
        }
      } catch (error) {
        console.error('Error during initial load:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize interview. Please try again.",
          variant: "destructive",
        });
      }
    };

    handleInitialLoad();
  }, [initializeSession, checkForRecovery, toast]);

  // Handle WebSocket messages with error boundary
  useEffect(() => {
    if (!lastMessage || !sessionId) return;
    
    try {
      console.log('Processing WebSocket message:', lastMessage);
      
      if (lastMessage.type === 'ai_response') {
        const aiMessage: Message = {
          speaker: 'assistant',
          content: lastMessage.data.content,
          timestamp: new Date(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        
        // Handle audio response if present
        if (lastMessage.data.audio_response) {
          playAudioResponse(lastMessage.data.audio_response);
        }
      }
      
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      setIsLoading(false);
    }
  }, [lastMessage, sessionId]);

  // Enhanced voice recording with better error recovery
  const handleVoiceRecord = useCallback(async () => {
    try {
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      if (isRecording) {
        // Stop recording
        setIsLoading(true);
        const audioBlob = await stopRecording();
        
        if (audioBlob && audioBlob.size > 0) {
          try {
            const base64Audio = await convertBlobToBase64(audioBlob);
            console.log('Audio recorded, size:', audioBlob.size);
            
            const audioMessage: Message = {
              speaker: 'user',
              content: `[Voice message - ${Math.round(audioBlob.size / 1024)}KB]`,
              timestamp: new Date(),
              type: 'audio'
            };
            
            setMessages(prev => [...prev, audioMessage]);
            
            if (isConnected && sendWebSocketMessage) {
            const success = sendWebSocketMessage({
              type: 'audio_message',
              data: { 
                audio_data: base64Audio,
                session_id: sessionId 
              }
            });
              
              if (!success) {
                throw new Error('Failed to send WebSocket message');
              }
            } else {
              throw new Error('WebSocket not connected');
            }
            
          } catch (error) {
            console.error('Error processing audio:', error);
            toast({
              title: "Audio Processing Error",
              description: "Failed to process voice message. Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
          }
        } else {
          toast({
            title: "Recording Error", 
            description: "No audio data recorded. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
        
      } else {
        // Start recording
        const success = await startRecording();
        if (!success) {
          toast({
            title: "Recording Failed",
            description: "Could not start voice recording. Please check your microphone.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Voice recording error:', error);
      setIsLoading(false);
      toast({
        title: "Voice Error",
        description: "An error occurred with voice recording. Please try again.",
        variant: "destructive",
      });
    }
  }, [hasPermission, requestPermissions, isRecording, stopRecording, startRecording, convertBlobToBase64, isConnected, sendWebSocketMessage, sessionId, toast]);

  // Enhanced text message sending
  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || !sessionId || isLoading) return;

    try {
      const userMessage: Message = {
        speaker: 'user',
        content: currentMessage.trim(),
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, userMessage]);
      setCurrentMessage('');
      setIsLoading(true);
      
      if (isConnected && sendWebSocketMessage) {
        const success = sendWebSocketMessage({
          type: 'text_message',
          data: { 
            message: currentMessage.trim(),
            session_id: sessionId 
          }
        });
        
        if (!success) {
          throw new Error('Failed to send message');
        }
      } else {
        throw new Error('WebSocket not connected');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      toast({
        title: "Message Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentMessage, sessionId, isLoading, isConnected, sendWebSocketMessage, toast]);

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

        clearRecovery();
        cleanupAudio();
        
        toast({
          title: "Interview Complete",
          description: "Your interview has been completed successfully.",
        });

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
        description: "Failed to complete interview. Please try again.",
        variant: "destructive",
      });
    }
  }, [sessionId, messages, timeElapsed, interviewType, clearRecovery, cleanupAudio, onComplete, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {question.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant={interviewType === 'technical' ? 'default' : 'secondary'}>
                  {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">
                        {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Start the conversation by typing or recording a voice message</p>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <MessageBubble key={index} message={message} index={index} />
                ))}
                
                {(isLoading || isProcessing) && (
                  <LoadingIndicator isProcessing={isProcessing} />
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={mode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('text')}
                >
                  Text
                </Button>
                <Button
                  variant={mode === 'voice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('voice')}
                >
                  Voice
                </Button>
              </div>
              
              {mode === 'text' ? (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your response..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isLoading || !isConnected}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    size="sm"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={handleVoiceRecord}
                    disabled={isProcessing || isLoading || !isConnected}
                    className="min-w-[120px]"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Stop ({Math.round(audioLevel * 100)}%)
                      </>
                    ) : isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Record Voice
                      </>
                    )}
                  </Button>
                  
                  {!isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retryConnection}
                      disabled={connectionState === 'connecting'}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Connection
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={completeInterview}>
            Complete Interview
          </Button>
          
          {canRecover && (
            <Button 
              variant="secondary" 
              onClick={recoverSession}
              disabled={isRecovering}
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recovering...
                </>
              ) : (
                'Continue Previous Session'
              )}
            </Button>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

StableInterviewQuestion.displayName = 'StableInterviewQuestion';

export default StableInterviewQuestion;