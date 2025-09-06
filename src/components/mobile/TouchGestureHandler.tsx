import React, { useRef, useEffect, ReactNode } from 'react';

interface TouchGestureHandlerProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  className?: string;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  longPressThreshold?: number;
  doubleTapThreshold?: number;
}

const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onTap,
  onDoubleTap,
  onLongPress,
  className = '',
  minSwipeDistance = 50,
  maxSwipeTime = 300,
  longPressThreshold = 500,
  doubleTapThreshold = 300
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress();
        }, longPressThreshold);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long press if finger moves
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Check if it's a valid swipe
      if (deltaTime <= maxSwipeTime) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if it's a horizontal or vertical swipe
        if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else if (absDeltaY > absDeltaX && absDeltaY > minSwipeDistance) {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        } else if (absDeltaX < 10 && absDeltaY < 10) {
          // Tap gesture
          const now = Date.now();
          
          if (onDoubleTap && now - lastTapRef.current < doubleTapThreshold) {
            onDoubleTap();
            lastTapRef.current = 0; // Reset to prevent triple tap
          } else if (onTap) {
            // Use setTimeout to allow for double tap detection
            setTimeout(() => {
              if (now === lastTapRef.current) {
                onTap();
              }
            }, doubleTapThreshold);
            lastTapRef.current = now;
          }
        }
      }

      touchStartRef.current = null;
    };

    const handleTouchCancel = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartRef.current = null;
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Cleanup
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    minSwipeDistance,
    maxSwipeTime,
    longPressThreshold,
    doubleTapThreshold
  ]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default TouchGestureHandler;