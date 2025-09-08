import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SaveOperation {
  id: string;
  table: string;
  recordId: string;
  data: any;
  retries: number;
  timestamp: number;
}

interface ConsolidatedAutoSaveOptions {
  interval?: number; // milliseconds between saves
  maxRetries?: number;
  enabled?: boolean;
}

export const useConsolidatedAutoSave = (options: ConsolidatedAutoSaveOptions = {}) => {
  const { interval = 10000, maxRetries = 3, enabled = true } = options;
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const saveQueueRef = useRef<Map<string, SaveOperation>>(new Map());
  const isProcessingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const circuitBreakerRef = useRef({
    failures: 0,
    lastFailure: 0,
    isOpen: false
  });

  // Circuit breaker pattern for failed saves
  const isCircuitBreakerOpen = useCallback(() => {
    const breaker = circuitBreakerRef.current;
    if (breaker.isOpen && Date.now() - breaker.lastFailure > 60000) {
      // Reset after 1 minute
      breaker.isOpen = false;
      breaker.failures = 0;
    }
    return breaker.isOpen;
  }, []);

  // Process the save queue
  const processSaveQueue = useCallback(async () => {
    if (isProcessingRef.current || saveQueueRef.current.size === 0 || isCircuitBreakerOpen()) {
      return;
    }

    isProcessingRef.current = true;
    setIsSaving(true);

    const operations = Array.from(saveQueueRef.current.values());
    const successfulSaves: string[] = [];

    for (const operation of operations) {
      try {
        const { error } = await supabase
          .from(operation.table as any)
          .update(operation.data)
          .eq('id', operation.recordId);

        if (error) {
          throw error;
        }

        successfulSaves.push(operation.id);
        circuitBreakerRef.current.failures = 0;
      } catch (error) {
        console.error(`Save operation failed for ${operation.id}:`, error);
        
        // Increment retry count
        operation.retries++;
        operation.timestamp = Date.now();
        
        // Remove if max retries exceeded
        if (operation.retries >= maxRetries) {
          console.error(`Max retries exceeded for save operation ${operation.id}`);
          successfulSaves.push(operation.id); // Remove from queue
          
          // Circuit breaker logic
          circuitBreakerRef.current.failures++;
          circuitBreakerRef.current.lastFailure = Date.now();
          
          if (circuitBreakerRef.current.failures >= 3) {
            circuitBreakerRef.current.isOpen = true;
            toast({
              title: "Auto-save temporarily disabled",
              description: "Multiple save failures detected. Please save manually.",
              variant: "destructive"
            });
          }
        }
      }
    }

    // Remove successful operations from queue
    successfulSaves.forEach(id => saveQueueRef.current.delete(id));
    
    // Update UI state
    if (successfulSaves.length > 0) {
      setLastSaved(new Date());
      setHasUnsavedChanges(saveQueueRef.current.size > 0);
    }
    
    setIsSaving(false);
    isProcessingRef.current = false;
  }, [maxRetries, toast, isCircuitBreakerOpen]);

  // Add operation to save queue
  const queueSave = useCallback((table: string, recordId: string, data: any, operationId?: string) => {
    if (!enabled || isCircuitBreakerOpen()) return;
    
    const id = operationId || `${table}-${recordId}-${Date.now()}`;
    
    saveQueueRef.current.set(id, {
      id,
      table,
      recordId,
      data,
      retries: 0,
      timestamp: Date.now()
    });
    
    setHasUnsavedChanges(true);
  }, [enabled, isCircuitBreakerOpen]);

  // Force immediate save
  const forceSave = useCallback(async () => {
    await processSaveQueue();
  }, [processSaveQueue]);

  // Setup auto-save interval
  useEffect(() => {
    if (!enabled) return;
    
    intervalRef.current = setInterval(processSaveQueue, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, processSaveQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Force save any remaining operations
      if (saveQueueRef.current.size > 0) {
        processSaveQueue();
      }
    };
  }, [processSaveQueue]);

  return {
    queueSave,
    forceSave,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    pendingOperations: saveQueueRef.current.size,
    circuitBreakerOpen: isCircuitBreakerOpen()
  };
};