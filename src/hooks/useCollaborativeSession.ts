import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStableRealtime } from './useStableRealtime';

export interface CollaborativeUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  status: 'online' | 'offline' | 'away';
  lastActive: Date;
  cursorPosition?: { x: number; y: number; };
}

export interface CollaborativeComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  questionId?: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionActivity {
  id: string;
  userId: string;
  userName: string;
  actionType: string;
  actionData: any;
  createdAt: Date;
}

export const useCollaborativeSession = (assessmentId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<CollaborativeUser[]>([]);
  const [comments, setComments] = useState<CollaborativeComment[]>([]);
  const [activity, setActivity] = useState<SessionActivity[]>([]);
  const [wsConnectionId, setWsConnectionId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    if (!user || !profile) return;

    try {
      // Generate or get session ID for this assessment
      const currentSessionId = `assessment_${assessmentId}`;
      setSessionId(currentSessionId);

      // Connect to collaborative WebSocket
      const wsUrl = `wss://axdwgxtukqqzupboojmx.functions.supabase.co/functions/v1/collaborative-sync`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Collaborative WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Join the session
        wsRef.current?.send(JSON.stringify({
          type: 'join_session',
          sessionId: currentSessionId,
          data: {
            userId: user.id,
            name: profile.full_name || user.email,
            email: user.email,
            role: profile.role === 'admin' ? 'owner' : 'editor',
            assessmentId
          }
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Collaborative WebSocket disconnected:', event.code);
        setIsConnected(false);

        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Collaborative WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error connecting to collaborative session:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to collaborative session",
        variant: "destructive"
      });
    }
  }, [user, profile, assessmentId, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setSessionId(null);
  }, []);

  const handleWebSocketMessage = (message: any) => {
    const { type, data, timestamp } = message;

    switch (type) {
      case 'connection':
        setWsConnectionId(data.connectionId);
        break;

      case 'session_joined':
        setCollaborators(data.collaborators || []);
        setComments(data.comments || []);
        break;

      case 'user_joined':
        toast({
          title: "User Joined",
          description: `${data.name} joined the session`
        });
        break;

      case 'comment_added':
        setComments(prev => [data, ...prev]);
        break;

      case 'comment_resolved':
        setComments(prev => prev.map(comment => 
          comment.id === data.id ? { ...comment, resolved: data.resolved } : comment
        ));
        break;

      case 'presence_updated':
        setCollaborators(prev => prev.map(collab =>
          collab.id === data.userId 
            ? { ...collab, status: data.status, lastActive: new Date() }
            : collab
        ));
        break;

      case 'cursor_update':
        setCollaborators(prev => prev.map(collab =>
          collab.id === data.userId
            ? { ...collab, cursorPosition: data.position }
            : collab
        ));
        break;

      case 'assessment_changed':
        // Handle real-time assessment changes
        console.log('Assessment changed:', data);
        break;

      case 'error':
        console.error('WebSocket error:', data.error);
        toast({
          title: "Collaboration Error",
          description: data.error,
          variant: "destructive"
        });
        break;

      default:
        console.log('Unknown message type:', type);
    }
  };

  const addComment = useCallback(async (content: string, questionId?: string) => {
    if (!wsRef.current || !user || !profile || !sessionId) return;

    wsRef.current.send(JSON.stringify({
      type: 'add_comment',
      sessionId,
      data: {
        authorId: user.id,
        authorName: profile.full_name || user.email,
        content,
        questionId
      }
    }));
  }, [user, profile, sessionId]);

  const resolveComment = useCallback(async (commentId: string, resolved: boolean) => {
    if (!wsRef.current || !sessionId) return;

    wsRef.current.send(JSON.stringify({
      type: 'resolve_comment',
      sessionId,
      data: {
        commentId,
        resolved
      }
    }));
  }, [sessionId]);

  const updatePresence = useCallback(async (status: 'online' | 'away') => {
    if (!wsRef.current || !user || !sessionId) return;

    wsRef.current.send(JSON.stringify({
      type: 'update_presence',
      sessionId,
      data: {
        userId: user.id,
        status
      }
    }));
  }, [user, sessionId]);

  const broadcastCursorPosition = useCallback((position: { x: number; y: number }) => {
    if (!wsRef.current || !user || !sessionId) return;

    wsRef.current.send(JSON.stringify({
      type: 'cursor_position',
      sessionId,
      data: {
        userId: user.id,
        position
      }
    }));
  }, [user, sessionId]);

  const broadcastAssessmentChange = useCallback((changeType: string, changes: any, summary: string) => {
    if (!wsRef.current || !user || !profile || !sessionId) return;

    wsRef.current.send(JSON.stringify({
      type: 'assessment_change',
      sessionId,
      data: {
        userId: user.id,
        userName: profile.full_name || user.email,
        changeType,
        changes,
        summary
      }
    }));
  }, [user, profile, sessionId]);

  // Real-time subscriptions using useStableRealtime
  useStableRealtime({
    table: 'collaborative_comments',
    filter: `session_id=eq.${sessionId}`,
    onInsert: (payload) => {
      console.log('Comment inserted:', payload);
      // Handle real-time comment updates from database
    },
    onUpdate: (payload) => {
      console.log('Comment updated:', payload);
      // Handle real-time comment updates from database  
    },
    onDelete: (payload) => {
      console.log('Comment deleted:', payload);
      // Handle real-time comment updates from database
    }
  });

  useStableRealtime({
    table: 'collaborators',
    filter: `session_id=eq.${sessionId}`,
    onInsert: (payload) => {
      console.log('Collaborator joined:', payload);
      // Handle real-time collaborator updates from database
    },
    onUpdate: (payload) => {
      console.log('Collaborator updated:', payload);
      // Handle real-time collaborator updates from database
    },
    onDelete: (payload) => {
      console.log('Collaborator left:', payload);
      // Handle real-time collaborator updates from database
    }
  });

  // Auto-connect when component mounts
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Handle window focus/blur for presence updates
  useEffect(() => {
    const handleFocus = () => updatePresence('online');
    const handleBlur = () => updatePresence('away');

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [updatePresence]);

  return {
    isConnected,
    sessionId,
    collaborators,
    comments,
    activity,
    wsConnectionId,
    connect,
    disconnect,
    addComment,
    resolveComment,
    updatePresence,
    broadcastCursorPosition,
    broadcastAssessmentChange
  };
};