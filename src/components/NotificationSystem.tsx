import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Bell, X, Info, AlertTriangle, CheckCircle, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useStableRealtime } from '@/hooks/useStableRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Enhanced notification types
export type NotificationType = 
  | 'assessment_published' 
  | 'assessment_submitted' 
  | 'evaluation_complete'
  | 'security_violation'
  | 'session_timeout'
  | 'system_alert'
  | 'assignment_due'
  | 'new_participant'
  | 'assessment_started'
  | 'proctoring_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  timestamp: string;
  userId: string;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Only establish realtime connections for authenticated users
  const shouldEnableRealtime = !!(user && profile);

  const assessmentRealtime = useStableRealtime({
    table: 'assessments',
    onUpdate: shouldEnableRealtime ? (payload) => {
      if (payload.new.status === 'published' && payload.old.status !== 'published') {
        addNotification({
          type: 'assessment_published',
          priority: 'medium',
          title: 'Assessment Published',
          message: `"${payload.new.title}" is now available for participants`,
          data: { assessmentId: payload.new.id },
          actionUrl: `/assessments/${payload.new.id}/preview`
        });
      }
    } : undefined
  });

  const instanceRealtime = useStableRealtime({
    table: 'assessment_instances',
    onInsert: shouldEnableRealtime ? (payload) => {
      // Notify instructors when someone starts their assessment
      if (profile?.role === 'instructor' || profile?.role === 'admin') {
        addNotification({
          type: 'new_participant',
          priority: 'low',
          title: 'New Assessment Started',
          message: 'A participant has begun taking an assessment',
          data: { instanceId: payload.new.id, assessmentId: payload.new.assessment_id }
        });
      }
    } : undefined,
    onUpdate: shouldEnableRealtime ? (payload) => {
      // Handle submission notifications
      if (payload.new.status === 'submitted' && payload.old.status !== 'submitted') {
        if (profile?.role === 'instructor' || profile?.role === 'admin') {
          addNotification({
            type: 'assessment_submitted',
            priority: 'medium',
            title: 'Assessment Submitted',
            message: 'A participant has submitted their assessment for review',
            data: { instanceId: payload.new.id },
            actionUrl: `/monitoring?instance=${payload.new.id}`
          });
        }
      }

      // Handle security violations
      if (payload.new.proctoring_violations && 
          JSON.stringify(payload.new.proctoring_violations) !== JSON.stringify(payload.old.proctoring_violations)) {
        const violations = Array.isArray(payload.new.proctoring_violations) ? payload.new.proctoring_violations : [];
        const newViolations = violations.filter(v => 
          !Array.isArray(payload.old.proctoring_violations) || 
          !payload.old.proctoring_violations.find(ov => ov.timestamp === v.timestamp)
        );

        newViolations.forEach(violation => {
          addNotification({
            type: 'security_violation',
            priority: violation.severity === 'critical' ? 'critical' : 'high',
            title: 'Security Alert',
            message: violation.description || 'Security violation detected during assessment',
            data: { instanceId: payload.new.id, violation },
            actionUrl: `/proctoring?instance=${payload.new.id}`
          });
        });
      }
    } : undefined
  });

  const evaluationRealtime = useStableRealtime({
    table: 'evaluations',
    onInsert: shouldEnableRealtime ? (payload) => {
      // Notify when evaluation is complete
      addNotification({
        type: 'evaluation_complete',
        priority: 'medium',
        title: 'Evaluation Complete',
        message: `Assessment has been evaluated with score: ${payload.new.score}/${payload.new.max_score}`,
        data: { evaluationId: payload.new.id, submissionId: payload.new.submission_id }
      });
    } : undefined
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>) => {
    if (!user) return;

    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
      userId: user.id
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast for high priority notifications
    if (notification.priority === 'high' || notification.priority === 'critical') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.priority === 'critical' ? 'destructive' : 'default',
      });
    }
  }, [user, toast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { markAsRead, removeNotification } = useNotifications();

  const getIcon = () => {
    switch (notification.type) {
      case 'assessment_submitted':
      case 'evaluation_complete': 
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'security_violation':
      case 'proctoring_alert': 
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'session_timeout':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default: 
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'critical': return 'border-l-red-500 bg-red-50/50';
      case 'high': return 'border-l-orange-500 bg-orange-50/50';
      case 'medium': return 'border-l-blue-500 bg-blue-50/50';
      case 'low': return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className={`p-4 border-l-4 ${getPriorityColor()} ${
      notification.read ? 'opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                {notification.title}
              </p>
              <Badge variant="outline" className="text-xs capitalize">
                {notification.priority}
              </Badge>
            </div>
            <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatTimestamp(notification.timestamp)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {!notification.read && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAsRead(notification.id)}
              className="h-6 w-6 p-0"
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => removeNotification(notification.id)}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span className="font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        </div>
        
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};