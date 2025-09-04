import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, AlertTriangle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit' | 'unauthorized_access' | 'security_violation';
  timestamp: number;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  maxRequestsPerMinute?: number;
}

export const SecurityGuard: React.FC<SecurityGuardProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  maxRequestsPerMinute = 60
}) => {
  const { user, profile, loading } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Request rate limiting
  useEffect(() => {
    const interval = setInterval(() => {
      setRequestCount(0);
      setIsBlocked(false);
    }, 60000); // Reset every minute

    return () => clearInterval(interval);
  }, []);

  // Monitor for suspicious activity
  useEffect(() => {
    const detectDevTools = () => {
      const startTime = performance.now();
      console.log('Security check');
      const endTime = performance.now();
      
      if (endTime - startTime > 100) {
        logSecurityEvent({
          type: 'suspicious_activity',
          timestamp: Date.now(),
          details: 'Developer tools detected',
          severity: 'medium'
        });
      }
    };

    const detectTabVisibility = () => {
      if (document.hidden) {
        logSecurityEvent({
          type: 'security_violation',
          timestamp: Date.now(),
          details: 'Tab switched or window minimized during assessment',
          severity: 'high'
        });
      }
    };

    // Run checks periodically
    const securityInterval = setInterval(detectDevTools, 5000);
    document.addEventListener('visibilitychange', detectTabVisibility);

    return () => {
      clearInterval(securityInterval);
      document.removeEventListener('visibilitychange', detectTabVisibility);
    };
  }, []);

  const logSecurityEvent = (event: SecurityEvent) => {
    setSecurityEvents(prev => [...prev.slice(-9), event]);
    
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn('🔒 Security Event:', event);
      
      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Send to your security monitoring service
        console.error('Security violation detected:', event);
      }
    }
  };

  const incrementRequestCount = () => {
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    
    if (newCount > maxRequestsPerMinute) {
      setIsBlocked(true);
      logSecurityEvent({
        type: 'rate_limit',
        timestamp: Date.now(),
        details: `Rate limit exceeded: ${newCount} requests per minute`,
        severity: 'high'
      });
    }
  };

  // Check authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You must be signed in to access this content.
              </AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role authorization
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                You don't have permission to access this content. Required roles: {allowedRoles.join(', ')}
              </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if blocked due to rate limiting
  if (isBlocked) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Rate Limit Exceeded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Too many requests. Please wait a minute before trying again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Increment request count for monitoring
  useEffect(() => {
    incrementRequestCount();
  }, []);

  return (
    <>
      {process.env.NODE_ENV === 'development' && securityEvents.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Security events detected ({securityEvents.length})
            </AlertDescription>
          </Alert>
        </div>
      )}
      {children}
    </>
  );
};

// HOC for easy wrapping
export const withSecurity = (
  Component: React.ComponentType<any>,
  securityOptions?: Omit<SecurityGuardProps, 'children'>
) => {
  return (props: any) => (
    <SecurityGuard {...securityOptions}>
      <Component {...props} />
    </SecurityGuard>
  );
};