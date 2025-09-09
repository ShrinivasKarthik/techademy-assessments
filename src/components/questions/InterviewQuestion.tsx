import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, MessageCircle, Clock, User, Bot, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [question.id, instanceId, interviewType, duration, config]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const connectWebSocket = useCallback(() => {
    if (mode !== 'voice' || !sessionId) return;

    try {
      const projectId = 'axdwgxtukqqzupboojmx'; // Your Supabase project ID
      wsRef.current = new WebSocket(`wss://${projectId}.functions.supabase.co/interview-bot`);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        
        // Send session info
        wsRef.current?.send(JSON.stringify({
          type: 'init_session',
          session_id: sessionId,
          interview_type: interviewType
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ai_response') {
            const aiMessage: Message = {
              speaker: 'assistant',
              content: data.content,
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, aiMessage]);
            
            // Save to database
            saveMessage(aiMessage);
          } else if (data.type === 'audio_response') {
            // Handle audio playback
            playAudioResponse(data.audio);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [mode, sessionId, interviewType]);

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

      if (mode === 'voice' && wsRef.current?.readyState === WebSocket.OPEN) {
        // Send via WebSocket for voice mode
        wsRef.current.send(JSON.stringify({
          type: 'user_message',
          content: currentMessage,
          session_id: sessionId
        }));
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Convert to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio_message',
              audio: base64Audio,
              session_id: sessionId
            }));
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const playAudioResponse = async (audioBase64: string) => {
    try {
      const audioData = atob(audioBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      if (audioContextRef.current) {
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioArray.buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
      }
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

  // Connect WebSocket when switching to voice mode
  useEffect(() => {
    if (mode === 'voice' && sessionId) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mode, sessionId, connectWebSocket]);

  return (
    <div className="space-y-6">
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
              <Badge variant="outline" className="ml-2 text-xs">
                {isConnected ? 'Connected' : 'Connecting...'}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
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
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="w-20 h-20 rounded-full"
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Interview */}
      <div className="flex justify-center">
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