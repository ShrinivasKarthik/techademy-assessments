import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logErrors?: boolean;
  retryable?: boolean;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { showToast = true, logErrors = true, retryable = true } = options;
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    if (logErrors) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }
    
    setError(errorMessage);
    
    if (showToast) {
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    return errorMessage;
  }, [showToast, logErrors, toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (!retryable || isRetrying) return;
    
    setIsRetrying(true);
    clearError();
    
    try {
      await retryFn();
    } catch (error) {
      handleError(error, 'retry');
    } finally {
      setIsRetrying(false);
    }
  }, [retryable, isRetrying, clearError, handleError]);

  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      clearError();
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        throw error;
      }
    };
  }, [handleError, clearError]);

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
    wrapAsync
  };
};