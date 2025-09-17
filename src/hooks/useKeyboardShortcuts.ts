import { useEffect, useRef } from 'react';

interface KeyboardShortcutsProps {
  onFocusLeft: () => void;
  onFocusCenter: () => void;
  onFocusRight: () => void;
  onToggleFocus: () => void;
}

export const useKeyboardShortcuts = ({
  onFocusLeft,
  onFocusCenter,
  onFocusRight,
  onToggleFocus
}: KeyboardShortcutsProps) => {
  const shortcutsRef = useRef<KeyboardShortcutsProps>();
  
  // Update ref to latest callbacks
  shortcutsRef.current = {
    onFocusLeft,
    onFocusCenter,
    onFocusRight,
    onToggleFocus
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !shortcutsRef.current) return;

      switch (event.key) {
        case '1':
          event.preventDefault();
          shortcutsRef.current.onFocusLeft();
          break;
        case '2':
          event.preventDefault();
          shortcutsRef.current.onFocusCenter();
          break;
        case '3':
          event.preventDefault();
          shortcutsRef.current.onFocusRight();
          break;
        case '\\':
          event.preventDefault();
          shortcutsRef.current.onToggleFocus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};