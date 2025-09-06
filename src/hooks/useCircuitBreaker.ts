import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  failureRate: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

export const useCircuitBreaker = (
  name: string,
  config: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 60000  // 1 minute
  }
) => {
  const { toast } = useToast();
  const [state, setState] = useState<CircuitBreakerState>('closed');
  const [failureCount, setFailureCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [lastFailureTime, setLastFailureTime] = useState<Date | undefined>();
  const [nextRetryTime, setNextRetryTime] = useState<Date | undefined>();
  
  const requestHistory = useRef<{ timestamp: number; success: boolean }[]>([]);
  const recoveryTimer = useRef<NodeJS.Timeout | null>(null);

  const cleanupHistory = useCallback(() => {
    const now = Date.now();
    const cutoff = now - config.monitoringWindow;
    requestHistory.current = requestHistory.current.filter(
      record => record.timestamp > cutoff
    );
  }, [config.monitoringWindow]);

  const calculateFailureRate = useCallback(() => {
    cleanupHistory();
    const recentRequests = requestHistory.current;
    if (recentRequests.length === 0) return 0;
    
    const failures = recentRequests.filter(record => !record.success).length;
    return failures / recentRequests.length;
  }, [cleanupHistory]);

  const recordSuccess = useCallback(() => {
    setSuccessCount(prev => prev + 1);
    setTotalRequests(prev => prev + 1);
    requestHistory.current.push({ timestamp: Date.now(), success: true });
    
    // Reset failure count on success in half-open state
    if (state === 'half-open') {
      setState('closed');
      setFailureCount(0);
      toast({
        title: "Service Recovered",
        description: `Circuit breaker for ${name} is now closed.`,
        variant: "default"
      });
    }
  }, [state, name, toast]);

  const recordFailure = useCallback(() => {
    const now = new Date();
    setFailureCount(prev => prev + 1);
    setTotalRequests(prev => prev + 1);
    setLastFailureTime(now);
    requestHistory.current.push({ timestamp: now.getTime(), success: false });

    const newFailureCount = failureCount + 1;
    
    if (newFailureCount >= config.failureThreshold && state === 'closed') {
      setState('open');
      const retryTime = new Date(now.getTime() + config.recoveryTimeout);
      setNextRetryTime(retryTime);
      
      toast({
        title: "Service Unavailable",
        description: `Circuit breaker for ${name} is now open. Retrying in ${config.recoveryTimeout / 1000}s.`,
        variant: "destructive"
      });

      // Set recovery timer
      recoveryTimer.current = setTimeout(() => {
        setState('half-open');
        setNextRetryTime(undefined);
        toast({
          title: "Service Test",
          description: `Circuit breaker for ${name} is now half-open. Testing service...`,
          variant: "default"
        });
      }, config.recoveryTimeout);
    }
  }, [failureCount, state, config, name, toast]);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> => {
    // Block requests when circuit is open
    if (state === 'open') {
      if (fallback) {
        return fallback();
      }
      throw new Error(`Circuit breaker for ${name} is open`);
    }

    // Allow limited requests when half-open
    if (state === 'half-open') {
      // Only allow one test request at a time
      setState('open'); // Temporarily block other requests
    }

    try {
      const result = await operation();
      recordSuccess();
      return result;
    } catch (error) {
      recordFailure();
      
      if (fallback) {
        try {
          return await fallback();
        } catch (fallbackError) {
          throw error; // Throw original error if fallback fails
        }
      }
      
      throw error;
    }
  }, [state, name, recordSuccess, recordFailure]);

  const forceOpen = useCallback(() => {
    setState('open');
    const retryTime = new Date(Date.now() + config.recoveryTimeout);
    setNextRetryTime(retryTime);
  }, [config.recoveryTimeout]);

  const forceClose = useCallback(() => {
    setState('closed');
    setFailureCount(0);
    setNextRetryTime(undefined);
    if (recoveryTimer.current) {
      clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState('closed');
    setFailureCount(0);
    setSuccessCount(0);
    setTotalRequests(0);
    setLastFailureTime(undefined);
    setNextRetryTime(undefined);
    requestHistory.current = [];
    
    if (recoveryTimer.current) {
      clearTimeout(recoveryTimer.current);
      recoveryTimer.current = null;
    }
  }, []);

  const metrics: CircuitBreakerMetrics = {
    state,
    failureCount,
    successCount,
    totalRequests,
    failureRate: calculateFailureRate(),
    lastFailureTime,
    nextRetryTime
  };

  return {
    metrics,
    execute,
    forceOpen,
    forceClose,
    reset
  };
};