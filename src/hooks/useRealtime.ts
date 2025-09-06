import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Keep the existing interface for backward compatibility
export interface RealtimeSubscription {
  channel: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
}

// Original useRealtime hook (preserved for backward compatibility)
export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionsRef = useState<Map<string, any>>(new Map())[0];

  const subscribe = (subscription: RealtimeSubscription) => {
    const channelName = `${subscription.channel}_${Date.now()}`;
    
    let channel = supabase.channel(channelName);

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

    channel.subscribe((status) => {
      console.log(`Subscription ${channelName} status:`, status);
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      }
    });

    subscriptionsRef.set(channelName, channel);
    return channelName;
  };

  const unsubscribe = (channelName: string) => {
    const channel = subscriptionsRef.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      subscriptionsRef.delete(channelName);
    }
  };

  const unsubscribeAll = () => {
    subscriptionsRef.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.clear();
    setIsConnected(false);
  };

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

// New enhanced realtime hooks
interface UseRealtimeV2Props {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealtimeV2 = ({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete
}: UseRealtimeV2Props) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const { toast } = useToast();

  const connect = useCallback(() => {
    // Skip connection if disabled or no callbacks provided
    if (!onInsert && !onUpdate && !onDelete) {
      return;
    }
    
    // Don't connect if already connected or connecting
    if (subscriptionRef.current || connectionState === 'connecting') {
      return;
    }

    setConnectionState('connecting');
    
    const channelName = `${table}_${filter || 'all'}_${Date.now()}`;
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
  }, [table, filter, onInsert, onUpdate, onDelete, connectionState, toast]);

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
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect
  };
};

// Hook for assessment-specific realtime updates
export const useAssessmentRealtime = (assessmentId: string) => {
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // Subscribe to assessment changes
  const assessmentRealtime = useRealtimeV2({
    table: 'assessments',
    filter: `id=eq.${assessmentId}`,
    onUpdate: (payload) => {
      setAssessmentData(payload.new);
    }
  });

  // Subscribe to assessment instances
  const instancesRealtime = useRealtimeV2({
    table: 'assessment_instances',
    filter: `assessment_id=eq.${assessmentId}`,
    onInsert: (payload) => {
      setInstances(prev => [...prev, payload.new]);
    },
    onUpdate: (payload) => {
      setInstances(prev => 
        prev.map(instance => 
          instance.id === payload.new.id ? payload.new : instance
        )
      );
    },
    onDelete: (payload) => {
      setInstances(prev => 
        prev.filter(instance => instance.id !== payload.old.id)
      );
    }
  });

  // Subscribe to questions
  const questionsRealtime = useRealtimeV2({
    table: 'questions',
    filter: `assessment_id=eq.${assessmentId}`,
    onInsert: (payload) => {
      setQuestions(prev => [...prev, payload.new].sort((a, b) => a.order_index - b.order_index));
    },
    onUpdate: (payload) => {
      setQuestions(prev => 
        prev.map(question => 
          question.id === payload.new.id ? payload.new : question
        ).sort((a, b) => a.order_index - b.order_index)
      );
    },
    onDelete: (payload) => {
      setQuestions(prev => 
        prev.filter(question => question.id !== payload.old.id)
      );
    }
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load assessment
        const { data: assessment } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single();
        
        if (assessment) setAssessmentData(assessment);

        // Load instances
        const { data: instancesData } = await supabase
          .from('assessment_instances')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('started_at', { ascending: false });
        
        if (instancesData) setInstances(instancesData);

        // Load questions
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('order_index');
        
        if (questionsData) setQuestions(questionsData);

      } catch (error) {
        console.error('Error loading initial assessment data:', error);
      }
    };

    loadInitialData();
  }, [assessmentId]);

  return {
    assessmentData,
    instances,
    questions,
    isConnected: assessmentRealtime.isConnected && instancesRealtime.isConnected && questionsRealtime.isConnected,
    connections: {
      assessment: assessmentRealtime.isConnected,
      instances: instancesRealtime.isConnected,
      questions: questionsRealtime.isConnected
    }
  };
};
