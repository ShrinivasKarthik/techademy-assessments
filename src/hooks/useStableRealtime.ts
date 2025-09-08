import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealtimeConfig {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

interface ConnectionState {
  isConnected: boolean;
  connectionAttempts: number;
  lastConnectionTime: number;
}

export const useStableRealtime = (config: RealtimeConfig) => {
  const { table, filter, onInsert, onUpdate, onDelete } = config;
  const { toast } = useToast();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    connectionAttempts: 0,
    lastConnectionTime: 0
  });
  
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  
  // Stable connection management
  const connect = useCallback(() => {
    if (isUnmountedRef.current || channelRef.current) return;
    
    // Skip if no callbacks provided (for anonymous users)
    if (!onInsert && !onUpdate && !onDelete) {
      console.log(`Skipping realtime connection for ${table} - no callbacks provided`);
      return;
    }
    
    const channelName = `${table}_stable_${Date.now()}`;
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
      if (isUnmountedRef.current) return;
      
      console.log(`Realtime event on ${table}:`, payload.eventType);
      
      try {
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
      } catch (error) {
        console.error(`Error handling realtime event for ${table}:`, error);
      }
    });
    
    channel.subscribe((status) => {
      if (isUnmountedRef.current) return;
      
      console.log(`Realtime subscription status for ${table}:`, status);
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: status === 'SUBSCRIBED',
        lastConnectionTime: Date.now()
      }));
      
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        channelRef.current = null;
        
        // Exponential backoff reconnection
        if (!isUnmountedRef.current) {
          const backoffTime = Math.min(1000 * Math.pow(2, connectionState.connectionAttempts), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              setConnectionState(prev => ({
                ...prev,
                connectionAttempts: prev.connectionAttempts + 1
              }));
              connect();
            }
          }, backoffTime);
        }
      } else if (status === 'SUBSCRIBED') {
        // Reset connection attempts on successful connection
        setConnectionState(prev => ({
          ...prev,
          connectionAttempts: 0
        }));
      }
    });
    
    channelRef.current = channel;
  }, [table, filter, onInsert, onUpdate, onDelete, connectionState.connectionAttempts]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (channelRef.current) {
      console.log(`Disconnecting from ${table}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: false
      }));
    }
  }, [table]);
  
  // Initialize connection
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [disconnect]);
  
  return {
    isConnected: connectionState.isConnected,
    connectionAttempts: connectionState.connectionAttempts,
    connect,
    disconnect
  };
};