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

export const useInterviewWebSocket = (sessionId?: string, wsUrl?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<InterviewWebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [sessionReady, setSessionReady] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = useCallback(() => {
    return `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/interview-bot`;
  }, []);

  // Circuit breaker for preventing rapid reconnection attempts
  const [circuitBreakerState, setCircuitBreakerState] = useState<'closed' | 'open' | 'half-open'>('closed');

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || !sessionId) return;
    
    // Circuit breaker check
    if (circuitBreakerState === 'open') {
      console.log('Circuit breaker is open, preventing connection attempt');
      return;
    }

    const wsUrlToUse = wsUrl || getWebSocketUrl();
    console.log('Attempting to connect to WebSocket:', wsUrlToUse);
    setConnectionState('connecting');
    
    try {
      wsRef.current = new WebSocket(wsUrlToUse);

      wsRef.current.onopen = () => {
        console.log('Interview WebSocket connected to:', wsUrlToUse);
        setIsConnected(true);
        setConnectionState('connected');
        setSessionReady(false);
        reconnectAttempts.current = 0;
        setLastHeartbeat(Date.now());

        // Wait for connection_ready before sending init
        // Session initialization will be sent after connection_ready is received
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: InterviewWebSocketMessage = JSON.parse(event.data);
          console.log('Interview WebSocket message received:', message);
          
          // Handle system messages
          if (message.type === 'connection_ready') {
            console.log('Connection ready, sending session init...');
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
              console.log('Sending init message:', initMessage);
              wsRef.current.send(JSON.stringify(initMessage));
            }
            return;
          }
          
          if (message.type === 'session_ready') {
            console.log('Session ready confirmed');
            setSessionReady(true);
            setCircuitBreakerState('closed'); // Reset circuit breaker on successful session
            return;
          }
          
          if (message.type === 'heartbeat') {
            setLastHeartbeat(Date.now());
            // Send pong response
            if (wsRef.current) {
              wsRef.current.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
            return;
          }
          
          if (message.type === 'session_error') {
            console.error('Session error:', message.error);
            setSessionReady(false);
            toast({
              title: "Session Error",
              description: message.error || "Session connection failed",
              variant: "destructive",
            });
            return;
          }
          
          // Process regular messages only if session is ready
          if (sessionReady || message.type === 'ai_response') {
            setLastMessage(message);
          }
          
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
          setCircuitBreakerState('open');
          toast({
            title: "Connection Lost",
            description: "Unable to reconnect to interview service. Please refresh the page.",
            variant: "destructive",
          });
          
          // Reset circuit breaker after 30 seconds
          setTimeout(() => {
            setCircuitBreakerState('closed');
            reconnectAttempts.current = 0;
          }, 30000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Interview WebSocket error:', error);
        console.error('WebSocket URL was:', wsUrlToUse);
        console.error('Session ID:', sessionId);
        setConnectionState('disconnected');
        
        // Only show error toast if we haven't already exceeded max attempts
        if (reconnectAttempts.current === 0) {
          toast({
            title: "Connection Error", 
            description: "Failed to connect to interview service. Retrying...",
            variant: "destructive",
          });
        }
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
  }, [sessionId, user?.id, toast, getWebSocketUrl, wsUrl, circuitBreakerState])

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
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId && sessionReady) {
      const fullMessage: InterviewWebSocketMessage = {
        type: message.type,
        data: message.data,
        timestamp: Date.now(),
        sessionId
      };
      
      console.log('Sending message:', fullMessage);
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    } else {
      const reason = !sessionReady ? 'Session not ready' : 'WebSocket not connected';
      console.warn(`Cannot send message: ${reason}`);
      
      toast({
        title: "Connection Issue",
        description: `${reason}. Please wait or try again.`,
        variant: "destructive",
      });
      
      // Attempt to reconnect if needed
      if (sessionId && wsRef.current?.readyState !== WebSocket.CONNECTING) {
        connect();
      }
      return false;
    }
  }, [sessionId, sessionReady, toast, connect]);

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
    sessionReady,
    lastMessage,
    lastHeartbeat,
    connect,
    disconnect,
    sendMessage,
    retry
  };
};