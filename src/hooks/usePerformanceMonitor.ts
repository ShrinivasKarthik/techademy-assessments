import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const startTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current++;
    
    // Only monitor performance in development
    if (process.env.NODE_ENV === 'development') {
      const loadTime = Date.now() - startTimeRef.current;
      
      if (loadTime > 1000) {
        console.warn(`${componentName} slow load detected: ${loadTime}ms`);
      }
      
      if (renderCountRef.current > 10) {
        console.warn(`${componentName} excessive renders: ${renderCountRef.current}`);
      }

      // Memory monitoring if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        if (memoryUsage > 100) {
          console.warn(`${componentName} high memory usage: ${memoryUsage.toFixed(2)}MB`);
        }
      }
    }
  });

  const markPerformance = (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-${label}`);
    }
  };

  const measurePerformance = (startLabel: string, endLabel: string) => {
    if (process.env.NODE_ENV === 'development') {
      try {
        performance.measure(
          `${componentName}-${startLabel}-to-${endLabel}`,
          `${componentName}-${startLabel}`,
          `${componentName}-${endLabel}`
        );
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  };

  return {
    markPerformance,
    measurePerformance,
    renderCount: renderCountRef.current
  };
};