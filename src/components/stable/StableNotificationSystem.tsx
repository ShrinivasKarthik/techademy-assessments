import React, { useState, useEffect, useCallback, memo } from 'react';
import { Bell, Check, CheckCheck, X, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStableRealtime } from '@/hooks/useStableRealtime';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Stable, optimized notification system to prevent subscription loops

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ASSESSMENT = 'assessment',
  EVALUATION = 'evaluation'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  userId: string;
  actionUrl?: string;
}

interface StableNotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'userId' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  isConnected: boolean;
}

const StableNotificationContext = React.createContext<StableNotificationContextType | undefined>(undefined);

export const useStableNotifications = () => {
  const context = React.useContext(StableNotificationContext);
  if (context === undefined) {
    throw new Error('useStableNotifications must be used within a StableNotificationProvider');
  }
  return context;
};

// Memoized notification item component
const NotificationItem = memo(({ 
  notification, 
  onMarkAsRead, 
  onRemove 
}: { 
  notification: Notification; 
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case NotificationType.ERROR:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case NotificationType.ASSESSMENT:
        return <Clock className="h-4 w-4 text-blue-500" />;
      case NotificationType.EVALUATION:
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case NotificationPriority.URGENT:
        return 'border-l-red-500 bg-red-50';
      case NotificationPriority.HIGH:
        return 'border-l-orange-500 bg-orange-50';
      case NotificationPriority.MEDIUM:
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  return (
    <div className={`border-l-4 p-3 ${getPriorityColor()} ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-30'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                {notification.title}
              </h4>
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 break-words">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {notification.timestamp.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-1 ml-2">
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(notification.id)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});

// Memoized notification bell component
const StableNotificationBell = memo(() => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    isConnected
  } = useStableNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className={`h-5 w-5 ${isConnected ? 'text-foreground' : 'text-muted-foreground'}`} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex space-x-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
          {!isConnected && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ Real-time updates disconnected
            </p>
          )}
        </div>
        
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onRemove={removeNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

// Stable notification provider with optimized realtime subscriptions
export const StableNotificationProvider = memo(({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Optimized realtime subscriptions with memoized callbacks
  const { isConnected: assessmentConnection } = useStableRealtime({
    table: 'assessments',
    onInsert: useCallback((payload) => {
      if (payload.new.created_by !== user?.id) return;
      
      addNotification({
        type: NotificationType.ASSESSMENT,
        priority: NotificationPriority.MEDIUM,
        title: 'New Assessment Created',
        message: `Assessment "${payload.new.title}" has been created successfully.`
      });
    }, [user?.id]),
    onUpdate: useCallback((payload) => {
      if (payload.new.created_by !== user?.id) return;
      
      addNotification({
        type: NotificationType.ASSESSMENT,
        priority: NotificationPriority.LOW,
        title: 'Assessment Updated',
        message: `Assessment "${payload.new.title}" has been updated.`
      });
    }, [user?.id])
  });

  const { isConnected: instanceConnection } = useStableRealtime({
    table: 'assessment_instances',
    onInsert: useCallback((payload) => {
      if (payload.new.participant_id !== user?.id) return;
      
      addNotification({
        type: NotificationType.ASSESSMENT,
        priority: NotificationPriority.HIGH,
        title: 'Assessment Started',
        message: `Your assessment session has begun. Good luck!`
      });
    }, [user?.id]),
    onUpdate: useCallback((payload) => {
      if (payload.new.participant_id !== user?.id) return;
      
      if (payload.new.status === 'completed') {
        addNotification({
          type: NotificationType.SUCCESS,
          priority: NotificationPriority.HIGH,
          title: 'Assessment Completed',
          message: `Your assessment has been submitted successfully.`
        });
      }
    }, [user?.id])
  });

  const { isConnected: evaluationConnection } = useStableRealtime({
    table: 'evaluations',
    onInsert: useCallback((payload) => {
      addNotification({
        type: NotificationType.EVALUATION,
        priority: NotificationPriority.HIGH,
        title: 'Evaluation Complete',
        message: `Your response has been evaluated. Score: ${payload.new.score}/${payload.new.max_score}`
      });
      
      toast({
        title: "Evaluation Complete",
        description: `New score: ${payload.new.score}/${payload.new.max_score}`,
      });
    }, [toast])
  });

  const isConnected = assessmentConnection && instanceConnection && evaluationConnection;

  // Memoized notification management functions
  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'userId' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: user?.id || '',
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
  }, [user?.id]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calculate unread count
  const unreadCount = React.useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );

  // Memoized context value
  const contextValue = React.useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    isConnected
  }), [
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    isConnected
  ]);

  return (
    <ErrorBoundary>
      <StableNotificationContext.Provider value={contextValue}>
        {children}
      </StableNotificationContext.Provider>
    </ErrorBoundary>
  );
});

StableNotificationProvider.displayName = 'StableNotificationProvider';
StableNotificationBell.displayName = 'StableNotificationBell';
NotificationItem.displayName = 'NotificationItem';

export { StableNotificationBell };
export default StableNotificationProvider;