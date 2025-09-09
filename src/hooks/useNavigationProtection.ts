import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationProtectionOptions {
  enabled: boolean;
  message?: string;
  onNavigation?: () => void;
}

export const useNavigationProtection = (options: NavigationProtectionOptions) => {
  const { enabled, message = 'You have unsaved changes. Are you sure you want to leave?', onNavigation } = options;
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, message]);

  const protectedNavigate = (to: string, options?: { replace?: boolean }) => {
    if (enabled && !hasNavigated.current) {
      const confirmed = window.confirm(message);
      if (!confirmed) return;
      
      if (onNavigation) {
        onNavigation();
      }
    }
    
    hasNavigated.current = true;
    navigate(to, options);
  };

  const clearProtection = () => {
    hasNavigated.current = true;
  };

  return {
    protectedNavigate,
    clearProtection
  };
};