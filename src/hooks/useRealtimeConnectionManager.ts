import { supabase } from '@/integrations/supabase/client';

interface RealtimeConfig {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

interface ConnectionInfo {
  channel: any;
  subscribers: Set<string>;
  config: Omit<RealtimeConfig, 'onInsert' | 'onUpdate' | 'onDelete'>;
  callbacks: Map<string, RealtimeConfig>;
  isConnected: boolean;
  lastActivity: number;
}

class RealtimeConnectionManager {
  private connections = new Map<string, ConnectionInfo>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup inactive connections every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 30000);
  }

  private getConnectionKey(table: string, filter?: string): string {
    return `${table}${filter ? `_${filter}` : ''}`;
  }

  private cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 minute

    for (const [key, connection] of this.connections.entries()) {
      if (connection.subscribers.size === 0 && now - connection.lastActivity > inactiveThreshold) {
        console.log(`Cleaning up inactive connection: ${key}`);
        this.forceDisconnect(key);
      }
    }
  }

  subscribe(config: RealtimeConfig, subscriberId: string): () => void {
    const { table, filter, onInsert, onUpdate, onDelete } = config;
    const connectionKey = this.getConnectionKey(table, filter);
    
    console.log(`Subscribing to ${connectionKey} with ID: ${subscriberId}`);

    let connection = this.connections.get(connectionKey);

    if (!connection) {
      // Create new connection
      const channelName = `${table}_pooled_${Date.now()}`;
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
        const conn = this.connections.get(connectionKey);
        if (!conn) return;

        conn.lastActivity = Date.now();
        
        // Broadcast to all subscribers
        for (const [id, callbacks] of conn.callbacks.entries()) {
          try {
            switch (payload.eventType) {
              case 'INSERT':
                callbacks.onInsert?.(payload);
                break;
              case 'UPDATE':
                callbacks.onUpdate?.(payload);
                break;
              case 'DELETE':
                callbacks.onDelete?.(payload);
                break;
            }
          } catch (error) {
            console.error(`Error handling realtime event for subscriber ${id}:`, error);
          }
        }
      });

      connection = {
        channel,
        subscribers: new Set(),
        config: { table, filter },
        callbacks: new Map(),
        isConnected: false,
        lastActivity: Date.now()
      };

      this.connections.set(connectionKey, connection);

      // Subscribe to channel
      channel.subscribe((status) => {
        const conn = this.connections.get(connectionKey);
        if (!conn) return;

        console.log(`Connection ${connectionKey} status: ${status}`);
        conn.isConnected = status === 'SUBSCRIBED';
        conn.lastActivity = Date.now();

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Reconnect if there are still subscribers
          if (conn.subscribers.size > 0) {
            setTimeout(() => {
              if (this.connections.has(connectionKey) && this.connections.get(connectionKey)!.subscribers.size > 0) {
                console.log(`Reconnecting ${connectionKey}`);
                this.reconnect(connectionKey);
              }
            }, 2000);
          }
        }
      });
    }

    // Add subscriber
    connection.subscribers.add(subscriberId);
    connection.callbacks.set(subscriberId, { table, filter, onInsert, onUpdate, onDelete });
    connection.lastActivity = Date.now();

    // Return unsubscribe function
    return () => {
      this.unsubscribe(connectionKey, subscriberId);
    };
  }

  private unsubscribe(connectionKey: string, subscriberId: string) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    console.log(`Unsubscribing ${subscriberId} from ${connectionKey}`);
    connection.subscribers.delete(subscriberId);
    connection.callbacks.delete(subscriberId);
    connection.lastActivity = Date.now();

    // If no more subscribers, mark for cleanup but don't immediately disconnect
    // This allows for quick reconnections
    if (connection.subscribers.size === 0) {
      console.log(`No more subscribers for ${connectionKey}, will cleanup if inactive`);
    }
  }

  private reconnect(connectionKey: string) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    // Remove old channel
    supabase.removeChannel(connection.channel);

    // Create new channel with same config
    const channelName = `${connection.config.table}_pooled_${Date.now()}`;
    const channel = supabase.channel(channelName);

    const changeConfig: any = {
      event: '*',
      schema: 'public',
      table: connection.config.table
    };

    if (connection.config.filter) {
      changeConfig.filter = connection.config.filter;
    }

    channel.on('postgres_changes', changeConfig, (payload) => {
      const conn = this.connections.get(connectionKey);
      if (!conn) return;

      conn.lastActivity = Date.now();
      
      // Broadcast to all subscribers
      for (const [id, callbacks] of conn.callbacks.entries()) {
        try {
          switch (payload.eventType) {
            case 'INSERT':
              callbacks.onInsert?.(payload);
              break;
            case 'UPDATE':
              callbacks.onUpdate?.(payload);
              break;
            case 'DELETE':
              callbacks.onDelete?.(payload);
              break;
          }
        } catch (error) {
          console.error(`Error handling realtime event for subscriber ${id}:`, error);
        }
      }
    });

    connection.channel = channel;
    channel.subscribe((status) => {
      const conn = this.connections.get(connectionKey);
      if (!conn) return;

      console.log(`Reconnected ${connectionKey} status: ${status}`);
      conn.isConnected = status === 'SUBSCRIBED';
      conn.lastActivity = Date.now();
    });
  }

  private forceDisconnect(connectionKey: string) {
    const connection = this.connections.get(connectionKey);
    if (!connection) return;

    console.log(`Force disconnecting ${connectionKey}`);
    supabase.removeChannel(connection.channel);
    this.connections.delete(connectionKey);
  }

  getConnectionStatus(table: string, filter?: string): boolean {
    const connectionKey = this.getConnectionKey(table, filter);
    const connection = this.connections.get(connectionKey);
    return connection?.isConnected || false;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Disconnect all connections
    for (const [key, connection] of this.connections.entries()) {
      supabase.removeChannel(connection.channel);
    }
    this.connections.clear();
  }
}

// Singleton instance
export const realtimeManager = new RealtimeConnectionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.destroy();
  });
}