import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Database,
  Save,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useConsolidatedAutoSave } from '@/hooks/useConsolidatedAutoSave';
import { useStableRealtime } from '@/hooks/useStableRealtime';

interface AssessmentHealthMonitorProps {
  assessmentId: string;
  participantId: string;
}

const AssessmentHealthMonitor: React.FC<AssessmentHealthMonitorProps> = ({
  assessmentId,
  participantId
}) => {
  const [performanceStats, setPerformanceStats] = useState({
    saveOperations: 0,
    failedSaves: 0,
    averageResponseTime: 0,
    lastSaveTime: null as Date | null
  });

  // Monitor auto-save system
  const autoSaveMonitor = useConsolidatedAutoSave({
    interval: 5000,
    enabled: false // Just for monitoring
  });

  // Monitor realtime connection
  const realtimeMonitor = useStableRealtime({
    table: 'assessment_instances',
    filter: `id=eq.${assessmentId}`,
    onUpdate: () => {
      // Just monitoring, no action needed
    }
  });

  const getSystemStatus = () => {
    const issues = [];
    
    if (!realtimeMonitor.isConnected) {
      issues.push('Realtime connection lost');
    }
    
    if (autoSaveMonitor.circuitBreakerOpen) {
      issues.push('Auto-save disabled due to failures');
    }
    
    if (autoSaveMonitor.pendingOperations > 5) {
      issues.push('High save queue backlog');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      issues
    };
  };

  const systemStatus = getSystemStatus();

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceStats(prev => ({
        ...prev,
        saveOperations: prev.saveOperations + (autoSaveMonitor.isSaving ? 1 : 0),
        lastSaveTime: autoSaveMonitor.lastSaved
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSaveMonitor.isSaving, autoSaveMonitor.lastSaved]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleForceRecovery = async () => {
    try {
      await autoSaveMonitor.forceSave();
      window.location.reload(); // Force fresh start if needed
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          System Health
          <div className={`w-2 h-2 rounded-full ${getStatusColor(systemStatus.status)}`} />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {realtimeMonitor.isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            Realtime Connection
          </div>
          <Badge variant={realtimeMonitor.isConnected ? 'default' : 'destructive'}>
            {realtimeMonitor.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Auto-save Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Save className="h-4 w-4" />
            Auto-save System
          </div>
          <Badge variant={autoSaveMonitor.circuitBreakerOpen ? 'destructive' : 'default'}>
            {autoSaveMonitor.circuitBreakerOpen ? 'Disabled' : 'Active'}
          </Badge>
        </div>

        {/* Pending Operations */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            Pending Saves
          </div>
          <Badge variant={autoSaveMonitor.pendingOperations > 5 ? 'destructive' : 'secondary'}>
            {autoSaveMonitor.pendingOperations}
          </Badge>
        </div>

        {/* Last Save Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Last Saved
          </div>
          <span className="text-xs text-muted-foreground">
            {autoSaveMonitor.lastSaved 
              ? `${Math.floor((Date.now() - autoSaveMonitor.lastSaved.getTime()) / 1000)}s ago`
              : 'Never'
            }
          </span>
        </div>

        {/* Issues */}
        {systemStatus.issues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Issues Detected
            </div>
            <ul className="text-xs space-y-1">
              {systemStatus.issues.map((issue, index) => (
                <li key={index} className="text-muted-foreground">• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recovery Actions */}
        {(systemStatus.status === 'warning' || systemStatus.status === 'error') && (
          <div className="pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleForceRecovery}
              className="w-full"
            >
              Force Recovery & Refresh
            </Button>
          </div>
        )}

        {/* System OK */}
        {systemStatus.status === 'healthy' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            All systems operational
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentHealthMonitor;