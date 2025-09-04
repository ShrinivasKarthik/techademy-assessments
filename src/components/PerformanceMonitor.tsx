import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  navigationTime: number;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  children: React.ReactNode;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  componentName, 
  children 
}) => {
  const startTime = useRef(performance.now());
  const { user } = useAuth();

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    // Collect performance metrics
    const metrics: PerformanceMetrics = {
      loadTime: endTime,
      renderTime,
      navigationTime: performance.getEntriesByType('navigation')[0]?.duration || 0,
    };

    // Add memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = memory.usedJSHeapSize;
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚀 Performance - ${componentName}`);
      console.log('Render Time:', `${renderTime.toFixed(2)}ms`);
      console.log('Load Time:', `${metrics.loadTime.toFixed(2)}ms`);
      console.log('Navigation Time:', `${metrics.navigationTime.toFixed(2)}ms`);
      if (metrics.memoryUsage) {
        console.log('Memory Usage:', `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
      console.groupEnd();
    }

    // Send to analytics in production (if needed)
    if (process.env.NODE_ENV === 'production' && renderTime > 1000) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      // You can send this to your analytics service
    }

    // Performance budget warnings
    if (renderTime > 500) {
      console.warn(`⚠️ Performance warning: ${componentName} render time exceeded 500ms`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      console.warn(`⚠️ Memory warning: High memory usage detected (${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB)`);
    }
  }, [componentName]);

  return <>{children}</>;
};

// Hook for manual performance tracking
export const usePerformanceTracker = () => {
  const trackOperation = (operationName: string, operation: () => Promise<any>) => {
    return async () => {
      const startTime = performance.now();
      
      try {
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
        }
        
        if (duration > 2000) {
          console.warn(`🐌 Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error(`❌ Failed operation: ${operationName} (${duration.toFixed(2)}ms)`, error);
        throw error;
      }
    };
  };

  const markStart = (label: string) => {
    performance.mark(`${label}-start`);
  };

  const markEnd = (label: string) => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${label}: ${measure.duration.toFixed(2)}ms`);
    }
  };

  return { trackOperation, markStart, markEnd };
};