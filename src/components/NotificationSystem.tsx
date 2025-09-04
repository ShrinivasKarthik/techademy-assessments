import React, { useState, useEffect, createContext, useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  X,
  Check,
  AlertTriangle,
  Info,
  CheckCircle,
  Users,
  FileText,
  Settings,
  MessageSquare
} from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionRequired?: boolean;
  relatedUserId?: string;
  relatedAssessmentId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isConnected, subscribe, unsubscribe } = useRealtime();
  const { user } = useAuth();

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast for important notifications
    if (notification.type === 'error' || notification.actionRequired) {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default'
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Set up real-time subscriptions for notifications
  useEffect(() => {
    if (isConnected && user) {
      // Subscribe to assessment instances for completion notifications
      const assessmentSubscription = subscribe({
        channel: 'notifications_assessments',
        table: 'assessment_instances',
        callback: (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'submitted') {
            addNotification({
              type: 'success',
              title: 'Assessment Completed',
              message: `A participant has completed an assessment`,
              relatedAssessmentId: payload.new.assessment_id
            });
          }
        }
      });

      // Subscribe to evaluations for grading notifications
      const evaluationSubscription = subscribe({
        channel: 'notifications_evaluations',
        table: 'evaluations',
        callback: (payload) => {
          if (payload.eventType === 'INSERT') {
            addNotification({
              type: 'info',
              title: 'New Evaluation',
              message: `An assessment has been graded`,
              relatedAssessmentId: payload.new.submission_id
            });
          }
        }
      });

      return () => {
        if (assessmentSubscription) unsubscribe(assessmentSubscription);
        if (evaluationSubscription) unsubscribe(evaluationSubscription);
      };
    }
  }, [isConnected, user, subscribe, unsubscribe, addNotification]);

  // Add some sample notifications for demonstration
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Suspicious Activity Detected',
        message: 'Multiple tab switches detected during assessment',
        timestamp: Date.now() - 300000,
        read: false,
        actionRequired: true,
        relatedUserId: 'user123'
      },
      {
        id: '2',
        type: 'success',
        title: 'Assessment Completed',
        message: 'John Doe has successfully completed the React Assessment',
        timestamp: Date.now() - 600000,
        read: false,
        relatedAssessmentId: 'assessment456'
      },
      {
        id: '3',
        type: 'info',
        title: 'New User Registration',
        message: 'Jane Smith has joined the platform',
        timestamp: Date.now() - 900000,
        read: true,
        relatedUserId: 'user789'
      }
    ];

    setNotifications(sampleNotifications);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { markAsRead, removeNotification } = useNotifications();

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBadgeVariant = () => {
    switch (notification.type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className={`p-4 border-l-4 ${
      notification.read ? 'border-l-gray-200 bg-gray-50/50' : 'border-l-primary bg-primary/5'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                {notification.title}
              </p>
              <Badge variant={getBadgeVariant()} className="text-xs">
                {notification.type}
              </Badge>
              {notification.actionRequired && (
                <Badge variant="outline" className="text-xs">
                  Action Required
                </Badge>
              )}
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

export const NotificationPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const { notifications, markAllAsRead, unreadCount } = useNotifications();

  if (!isOpen) return null;

  return (
    <Card className="absolute top-12 right-0 w-96 max-h-96 shadow-lg z-50">
      <CardContent className="p-0">
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
              <Button size="sm" variant="ghost" onClick={markAllAsRead} className="text-xs">
                Mark all read
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="max-h-80">
          {notifications.length > 0 ? (
            <div className="space-y-0">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem notification={notification} />
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default NotificationBell;