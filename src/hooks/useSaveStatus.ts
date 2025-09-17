import { useState, useEffect, useRef } from 'react';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export const useSaveStatus = () => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<Date>();

  const markUnsaved = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('unsaved');
  };

  const startSaving = () => {
    setSaveStatus('saving');
    
    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
      lastSaveRef.current = new Date();
    }, 2000);
  };

  const markSaved = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saved');
    lastSaveRef.current = new Date();
  };

  const markError = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('error');
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSave: lastSaveRef.current,
    markUnsaved,
    startSaving,
    markSaved,
    markError
  };
};