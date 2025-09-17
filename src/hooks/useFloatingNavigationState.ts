import { useState, useEffect, useRef, useCallback } from 'react';

interface NavigationState {
  isOpen: boolean;
  lastActivity: number;
  hasSeenHint: boolean;
  position: { top: number; left: number };
}

const STORAGE_KEY = 'floating-navigation-state';
const AUTO_HIDE_DELAY = 3000; // 3 seconds

export const useFloatingNavigationState = (isProjectQuestion: boolean = false) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [position, setPosition] = useState({ top: 16, left: 16 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hintTimeoutRef = useRef<NodeJS.Timeout>();

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: NavigationState = JSON.parse(saved);
        setPosition(state.position || { top: 16, left: 16 });
        
        // Show hint for first-time project question visitors
        if (isProjectQuestion && !state.hasSeenHint) {
          setShowHint(true);
          hintTimeoutRef.current = setTimeout(() => {
            setShowHint(false);
            saveState({ hasSeenHint: true });
          }, 5000);
        }
      } else if (isProjectQuestion) {
        // First time visiting project questions
        setShowHint(true);
        hintTimeoutRef.current = setTimeout(() => {
          setShowHint(false);
          saveState({ hasSeenHint: true });
        }, 5000);
      }
    } catch (error) {
      console.warn('Failed to load navigation state:', error);
    }
  }, [isProjectQuestion]);

  // Save state to localStorage
  const saveState = useCallback((updates: Partial<NavigationState>) => {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const state = current ? JSON.parse(current) : {};
      const newState = { ...state, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to save navigation state:', error);
    }
  }, []);

  // Auto-hide functionality for project questions
  useEffect(() => {
    if (!isProjectQuestion || !isOpen) return;

    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, AUTO_HIDE_DELAY);
    };

    resetTimeout();

    // Track user activity to reset auto-hide timer
    const handleActivity = () => {
      setLastActivity(Date.now());
      resetTimeout();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, isProjectQuestion]);

  // Context-aware positioning to avoid Monaco editor
  const updatePosition = useCallback((newPosition: { top: number; left: number }) => {
    // Ensure position doesn't conflict with common IDE layouts
    const safePosition = {
      top: Math.max(16, Math.min(newPosition.top, window.innerHeight - 100)),
      left: Math.max(16, Math.min(newPosition.left, window.innerWidth - 200))
    };
    
    setPosition(safePosition);
    saveState({ position: safePosition });
  }, [saveState]);

  // Enhanced open/close with state persistence
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLastActivity(Date.now());
    }
    saveState({ isOpen: open, lastActivity: Date.now() });
  }, [saveState]);

  // Dismiss hint manually
  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    saveState({ hasSeenHint: true });
  }, [saveState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    showHint,
    position,
    lastActivity,
    setIsOpen: handleOpenChange,
    updatePosition,
    dismissHint
  };
};