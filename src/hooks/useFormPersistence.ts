import { useState, useEffect, useCallback } from 'react';

interface FormPersistenceOptions {
  key: string;
  enabled?: boolean;
  autoSaveInterval?: number;
}

export const useFormPersistence = <T>(
  initialData: T,
  options: FormPersistenceOptions
) => {
  const { key, enabled = true, autoSaveInterval = 5000 } = options;
  const [formData, setFormData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load persisted data on mount only
  useEffect(() => {
    if (!enabled) return;

    // Only load from localStorage if we haven't initialized form data yet
    // This prevents overwriting user changes when the component re-renders
    if (JSON.stringify(formData) === JSON.stringify(initialData)) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsedData = JSON.parse(saved);
          // Remove the timestamp before setting form data
          const { _timestamp, ...actualData } = parsedData;
          setFormData(actualData);
          setLastSaved(new Date(_timestamp || Date.now()));
        }
      } catch (error) {
        console.warn('Failed to load persisted form data:', error);
      }
    }
  }, [key, enabled]); // Don't include formData or initialData in deps

  // Auto-save dirty data
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const interval = setInterval(() => {
      try {
        const dataToSave = {
          ...formData,
          _timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(dataToSave));
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (error) {
        console.warn('Failed to auto-save form data:', error);
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [formData, isDirty, key, enabled, autoSaveInterval]);

  const updateFormData = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setFormData(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      setIsDirty(true);
      return newData;
    });
  }, []);

  const clearPersistedData = useCallback(() => {
    if (!enabled) return;
    
    try {
      localStorage.removeItem(key);
      setLastSaved(null);
      setIsDirty(false);
    } catch (error) {
      console.warn('Failed to clear persisted form data:', error);
    }
  }, [key, enabled]);

  const forceSave = useCallback(() => {
    if (!enabled) return;

    try {
      const dataToSave = {
        ...formData,
        _timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(dataToSave));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.warn('Failed to force save form data:', error);
    }
  }, [formData, key, enabled]);

  return {
    formData,
    updateFormData,
    isDirty,
    lastSaved,
    clearPersistedData,
    forceSave
  };
};