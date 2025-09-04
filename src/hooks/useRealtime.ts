import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface RealtimeSubscription {
  channel: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
}

export const useRealtime = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionsRef = useRef<Map<string, any>>(new Map());

  const subscribe = (subscription: RealtimeSubscription) => {
    if (!user) return null;

    const channelName = `${subscription.channel}_${Date.now()}`;
    
    let channel = supabase.channel(channelName);

    // Configure the subscription based on table and filter
    if (subscription.table) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: subscription.table,
          filter: subscription.filter
        },
        (payload) => {
          console.log('Realtime event received:', payload);
          subscription.callback(payload);
        }
      );
    }

    // Subscribe and track the channel
    channel.subscribe((status) => {
      console.log(`Subscription ${channelName} status:`, status);
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Real-time updates active",
        });
      }
    });

    subscriptionsRef.current.set(channelName, channel);
    return channelName;
  };

  const unsubscribe = (channelName: string) => {
    const channel = subscriptionsRef.current.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      subscriptionsRef.current.delete(channelName);
    }
  };

  const unsubscribeAll = () => {
    subscriptionsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current.clear();
    setIsConnected(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, []);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    unsubscribeAll
  };
};