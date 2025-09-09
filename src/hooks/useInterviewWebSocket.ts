import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InterviewWebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  sessionId?: string;
  error?: string;
}

export const useInterviewWebSocket = (sessionId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<InterviewWebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = useCallback(() => {
    return `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/interview-bot`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || !sessionId) return;

    const wsUrl = getWebSocketUrl();
    setConnectionState('connecting');
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Interview WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts.current = 0;

        // Send session initialization
        if (sessionId && wsRef.current) {
          const initMessage: InterviewWebSocketMessage = {
            type: 'init_session',
            data: { 
              sessionId, 
              userId: user?.id,
              interview_type: 'behavioral'
            },
            timestamp: Date.now(),
            sessionId
          };
          wsRef.current.send(JSON.stringify(initMessage));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: InterviewWebSocketMessage = JSON.parse(event.data);
          console.log('Interview WebSocket message received:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Interview WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');

        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts && sessionId) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          toast({
            title: "Connection Lost",
            description: "Unable to reconnect to interview service. Please refresh the page.",
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Interview WebSocket error:', error);
        setConnectionState('disconnected');
        
        toast({
          title: "Connection Error", 
          description: "Failed to connect to interview service",
          variant: "destructive",
        });
      };

    } catch (error) {
      console.error('Error creating Interview WebSocket:', error);
      setConnectionState('disconnected');
      
      toast({
        title: "Connection Failed",
        description: "Could not establish connection to interview service",
        variant: "destructive",
      });
    }
  }, [sessionId, user?.id, toast, getWebSocketUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const sendMessage = useCallback((message: Omit<InterviewWebSocketMessage, 'timestamp' | 'sessionId'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      const fullMessage: InterviewWebSocketMessage = {
        type: message.type,
        data: message.data,
        timestamp: Date.now(),
        sessionId
      };
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    } else {
      console.warn('WebSocket not connected, cannot send message');
      
      toast({
        title: "Connection Lost",
        description: "Message could not be sent. Reconnecting...",
        variant: "destructive",
      });
      
      // Attempt to reconnect
      if (sessionId) {
        connect();
      }
      return false;
    }
  }, [sessionId, toast, connect]);

  const retry = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // Auto-connect when sessionId is available
  useEffect(() => {
    if (sessionId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    retry
  };
};