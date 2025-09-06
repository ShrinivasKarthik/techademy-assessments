import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedRealtimeProps {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

export const useOptimizedRealtime = ({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: UseOptimizedRealtimeProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const { toast } = useToast();

  const connect = useCallback(() => {
    // Skip connection if disabled or no callbacks provided
    if (!enabled || (!onInsert && !onUpdate && !onDelete)) {
      return;
    }
    
    // Don't connect if already connected or connecting
    if (subscriptionRef.current || connectionState === 'connecting') {
      return;
    }

    setConnectionState('connecting');
    
    const channelName = `optimized_${table}_${filter || 'all'}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    const changeConfig: any = {
      event: '*',
      schema: 'public',
      table: table
    };

    if (filter) {
      changeConfig.filter = filter;
    }

    channel.on('postgres_changes', changeConfig, (payload) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Realtime event on ${table}:`, payload);
      }
      
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload);
          break;
        case 'UPDATE':
          onUpdate?.(payload);
          break;
        case 'DELETE':
          onDelete?.(payload);
          break;
      }
    });

    channel.subscribe((status) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Realtime subscription status for ${table}:`, status);
      }
      
      setIsConnected(status === 'SUBSCRIBED');
      setConnectionState(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      
      if (status === 'SUBSCRIBED') {
        reconnectAttemptsRef.current = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionState('disconnected');
        
        // Only show toast in development or for critical errors
        if (process.env.NODE_ENV === 'development') {
          toast({
            title: "Connection Error",
            description: `Failed to connect to real-time updates for ${table}`,
            variant: "destructive",
          });
        }
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            disconnect();
            connect();
          }, delay);
        }
      }
    });

    subscriptionRef.current = channel;
  }, [table, filter, onInsert, onUpdate, onDelete, enabled, connectionState, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (subscriptionRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Disconnecting from', table);
      }
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
  }, [table]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect
  };
};