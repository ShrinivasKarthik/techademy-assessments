import { useState, useEffect, useRef } from 'react';

export const useQuestionTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingQuestionIndex, setPendingQuestionIndex] = useState<number | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  const startTransition = (questionIndex: number, onComplete: (index: number) => void) => {
    setIsTransitioning(true);
    setPendingQuestionIndex(questionIndex);

    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Simulate loading state for smooth UX
    transitionTimeoutRef.current = setTimeout(() => {
      onComplete(questionIndex);
      setIsTransitioning(false);
      setPendingQuestionIndex(null);
    }, 300); // Short delay for visual feedback
  };

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTransitioning,
    pendingQuestionIndex,
    startTransition
  };
};