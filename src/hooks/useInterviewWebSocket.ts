import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface InterviewWebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  sessionId?: string;
  error?: string;
}

export const useInterviewWebSocket = (sessionId?: string) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [lastMessage, setLastMessage] = useState<InterviewWebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const connect = useCallback(() => {
    if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const wsUrl = `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/interview-bot`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    setConnectionState('connecting');
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: InterviewWebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          if (message.type === 'connection_ready') {
            console.log('Connection ready, sending session init...');
            sendSessionInit();
            return;
          }
          
          if (message.type === 'session_ready') {
            console.log('Session ready confirmed');
            setSessionReady(true);
            return;
          }
          
          if (message.type === 'heartbeat') {
            // Send pong response
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
            return;
          }
          
          if (message.type === 'session_error' || message.type === 'error') {
            console.error('Session/WebSocket error:', message.error);
            setSessionReady(false);
            toast({
              title: "Connection Error",
              description: message.error || "Session connection failed",
              variant: "destructive",
            });
            return;
          }
          
          // Pass all other messages to component
          setLastMessage(message);
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setSessionReady(false);
        setConnectionState('disconnected');

        // Auto-reconnect if not a clean close and we have session
        if (event.code !== 1000 && sessionId && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('disconnected');
        
        if (reconnectAttempts.current === 0) {
          toast({
            title: "Connection Error",
            description: "Failed to connect to interview service",
            variant: "destructive",
          });
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionState('disconnected');
    }
  }, [sessionId, toast]);

  const sendSessionInit = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      const initMessage = {
        type: 'init_session',
        data: { 
          sessionId,
          interview_type: 'behavioral'
        },
        timestamp: Date.now()
      };
      
      console.log('Sending session init:', initMessage);
      wsRef.current.send(JSON.stringify(initMessage));
    }
  }, [sessionId]);

  const sendMessage = useCallback((message: Omit<InterviewWebSocketMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionReady) {
      const fullMessage = {
        ...message,
        timestamp: Date.now()
      };
      
      console.log('Sending WebSocket message:', fullMessage);
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    } else {
      const reason = !sessionReady ? 'Session not ready' : 'WebSocket not connected';
      console.warn(`Cannot send message: ${reason}`);
      
      toast({
        title: "Connection Issue",
        description: `${reason}. Please wait...`,
        variant: "destructive",
      });
      
      return false;
    }
  }, [sessionReady, toast]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
    setSessionReady(false);
    setConnectionState('disconnected');
  }, []);

  const retry = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // Auto-connect when sessionId is available
  useEffect(() => {
    if (sessionId) {
      connect();
    }
    return disconnect;
  }, [sessionId, connect, disconnect]);

  return {
    isConnected,
    sessionReady,
    lastMessage,
    connectionState,
    sendMessage,
    retry,
    disconnect
  };
};