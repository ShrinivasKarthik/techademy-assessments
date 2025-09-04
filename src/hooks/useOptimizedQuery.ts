import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface OptimizedQueryOptions<T> {
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  retry?: number;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
  enabled?: boolean;
}

interface OptimizedQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => void;
  refresh: () => void;
  invalidate: () => void;
}

export const useOptimizedQuery = <T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  options: OptimizedQueryOptions<T> = {}
): OptimizedQueryResult<T> => {
  // Optimized defaults for better performance
  const optimizedOptions = useMemo(() => ({
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  }), [options]);

  // Memoize query key to prevent unnecessary re-renders
  const memoizedQueryKey = useMemo(() => queryKey, [JSON.stringify(queryKey)]);

  // Memoize query function to prevent recreating on every render
  const memoizedQueryFn = useCallback(queryFn, []);

  const queryResult = useQuery({
    queryKey: memoizedQueryKey,
    queryFn: memoizedQueryFn,
    ...optimizedOptions
  });

  // Helper functions
  const refresh = useCallback(() => {
    queryResult.refetch();
  }, [queryResult.refetch]);

  const invalidate = useCallback(() => {
    // This would require access to queryClient
    // For now, we'll just refetch
    queryResult.refetch();
  }, [queryResult.refetch]);

  return {
    ...queryResult,
    refresh,
    invalidate
  };
};

// Hook for paginated queries with optimizations
export const useOptimizedPaginatedQuery = <T>(
  baseQueryKey: (string | number)[],
  queryFn: (page: number, limit: number) => Promise<{ data: T[]; total: number; hasMore: boolean }>,
  page: number = 1,
  limit: number = 10,
  options: OptimizedQueryOptions<{ data: T[]; total: number; hasMore: boolean }> = {}
) => {
  const queryKey = useMemo(() => [...baseQueryKey, 'paginated', page, limit], [baseQueryKey, page, limit]);
  
  const paginatedQueryFn = useCallback(() => queryFn(page, limit), [queryFn, page, limit]);

  return useOptimizedQuery(queryKey, paginatedQueryFn, {
    staleTime: 2 * 60 * 1000, // 2 minutes for paginated data
    cacheTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
};

// Hook for real-time data with intelligent refetching
export const useOptimizedRealTimeQuery = <T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  refetchInterval: number = 30000, // 30 seconds default
  options: OptimizedQueryOptions<T> = {}
) => {
  return useOptimizedQuery(queryKey, queryFn, {
    refetchInterval,
    refetchIntervalInBackground: false,
    staleTime: 0, // Always consider stale for real-time data
    cacheTime: 2 * 60 * 1000, // Short cache time
    ...options
  });
};

// Performance monitoring for queries
export const useQueryPerformanceMonitor = () => {
  const trackQuery = useCallback((queryKey: string[], startTime: number) => {
    return (data: any, error: any) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.group(`🔍 Query Performance - ${queryKey.join('.')}`);
        console.log('Duration:', `${duration.toFixed(2)}ms`);
        console.log('Success:', !error);
        console.log('Data size:', JSON.stringify(data || {}).length, 'bytes');
        console.groupEnd();
      }
      
      // Warn about slow queries
      if (duration > 2000) {
        console.warn(`🐌 Slow query detected: ${queryKey.join('.')} took ${duration.toFixed(2)}ms`);
      }
      
      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production' && duration > 5000) {
        console.error('Critical query performance issue:', {
          queryKey: queryKey.join('.'),
          duration,
          hasError: !!error
        });
      }
    };
  }, []);

  return { trackQuery };
};