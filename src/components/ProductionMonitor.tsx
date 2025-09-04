import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SystemMetrics {
  uptime: number;
  errors: number;
  responseTime: number;
  memoryUsage: number;
  activeUsers: number;
  lastCheck: number;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

export const ProductionMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    uptime: 0,
    errors: 0,
    responseTime: 0,
    memoryUsage: 0,
    activeUsers: 0,
    lastCheck: Date.now()
  });

  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or for admin users
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }

    const checkSystemHealth = async () => {
      const checks: HealthCheck[] = [];

      // Check API connectivity
      try {
        const start = performance.now();
        await fetch('/api/health', { method: 'HEAD' });
        const responseTime = performance.now() - start;
        
        checks.push({
          service: 'API',
          status: responseTime < 1000 ? 'healthy' : 'warning',
          message: `Response time: ${responseTime.toFixed(0)}ms`,
          timestamp: Date.now()
        });

        setMetrics(prev => ({
          ...prev,
          responseTime,
          lastCheck: Date.now()
        }));
      } catch (error) {
        checks.push({
          service: 'API',
          status: 'error',
          message: 'API unreachable',
          timestamp: Date.now()
        });
      }

      // Check browser performance
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        checks.push({
          service: 'Memory',
          status: memoryUsage < 0.8 ? 'healthy' : 'warning',
          message: `${(memoryUsage * 100).toFixed(1)}% used`,
          timestamp: Date.now()
        });

        setMetrics(prev => ({
          ...prev,
          memoryUsage: memoryUsage * 100
        }));
      }

      // Check for JavaScript errors
      const errorCount = (window as any).__errorCount || 0;
      checks.push({
        service: 'JavaScript',
        status: errorCount === 0 ? 'healthy' : errorCount < 5 ? 'warning' : 'error',
        message: `${errorCount} errors logged`,
        timestamp: Date.now()
      });

      setHealthChecks(checks);
    };

    // Track JavaScript errors
    const originalConsoleError = console.error;
    (window as any).__errorCount = 0;
    
    console.error = (...args) => {
      (window as any).__errorCount++;
      originalConsoleError.apply(console, args);
    };

    // Track unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      (window as any).__errorCount++;
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Initial check and interval
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
    }
  };

  const overallStatus = healthChecks.every(check => check.status === 'healthy') 
    ? 'healthy' 
    : healthChecks.some(check => check.status === 'error') 
    ? 'error' 
    : 'warning';

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 max-h-96 overflow-auto">
      <Card className="bg-background/95 backdrop-blur border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            System Monitor
            <Badge 
              variant="outline" 
              className={`ml-auto ${getStatusColor(overallStatus)} text-white border-0`}
            >
              {overallStatus.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Response Time</div>
              <div className="font-mono">{metrics.responseTime.toFixed(0)}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Memory Usage</div>
              <div className="font-mono">{metrics.memoryUsage.toFixed(1)}%</div>
            </div>
          </div>

          {/* Health Checks */}
          <div className="space-y-2">
            {healthChecks.map((check, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {getStatusIcon(check.status)}
                <span className="font-medium">{check.service}</span>
                <span className="text-muted-foreground ml-auto">{check.message}</span>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground border-t pt-2">
            Last check: {new Date(metrics.lastCheck).toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};