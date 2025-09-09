import { useEffect, useRef, useState } from 'react';
import { realtimeManager } from './useRealtimeConnectionManager';

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
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    connectionAttempts: 0,
    lastConnectionTime: 0
  });
  
  const subscriberIdRef = useRef<string>(`${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip if no callbacks provided (for anonymous users)
    if (!onInsert && !onUpdate && !onDelete) {
      console.log(`Skipping realtime connection for ${table} - no callbacks provided`);
      return;
    }

    if (isUnmountedRef.current) return;

    console.log(`Setting up stable realtime for ${table} with subscriber ${subscriberIdRef.current}`);

    // Subscribe to connection
    unsubscribeRef.current = realtimeManager.subscribe(config, subscriberIdRef.current);

    // Monitor connection status
    statusCheckIntervalRef.current = setInterval(() => {
      if (isUnmountedRef.current) return;
      
      const isConnected = realtimeManager.getConnectionStatus(table, filter);
      setConnectionState(prev => ({
        ...prev,
        isConnected,
        lastConnectionTime: isConnected ? Date.now() : prev.lastConnectionTime
      }));
    }, 1000);

    // Initial status check
    const initialStatus = realtimeManager.getConnectionStatus(table, filter);
    setConnectionState(prev => ({
      ...prev,
      isConnected: initialStatus,
      lastConnectionTime: initialStatus ? Date.now() : prev.lastConnectionTime
    }));

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      
      if (unsubscribeRef.current) {
        console.log(`Unsubscribing ${subscriberIdRef.current} from ${table}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      
      if (unsubscribeRef.current) {
        console.log(`Cleanup: Unsubscribing ${subscriberIdRef.current} from ${table}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [table]);

  return {
    isConnected: connectionState.isConnected,
    connectionAttempts: connectionState.connectionAttempts,
    connect: () => {
      // Connection is handled automatically by the manager
      console.log(`Connection for ${table} is managed by RealtimeConnectionManager`);
    },
    disconnect: () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  };
};