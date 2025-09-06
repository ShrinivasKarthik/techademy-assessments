import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active WebSocket connections
const connections = new Map<string, WebSocket>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  // Upgrade the connection to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();
  
  console.log(`New WebSocket connection: ${connectionId}`);
  connections.set(connectionId, socket);

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  socket.onopen = () => {
    console.log(`WebSocket ${connectionId} opened`);
    socket.send(JSON.stringify({
      type: 'connection',
      connectionId,
      timestamp: Date.now()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`Message from ${connectionId}:`, message);
      
      await handleMessage(connectionId, message, socket, supabase);
    } catch (error) {
      console.error(`Error handling message from ${connectionId}:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: Date.now()
      }));
    }
  };

  socket.onclose = () => {
    console.log(`WebSocket ${connectionId} closed`);
    connections.delete(connectionId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket ${connectionId} error:`, error);
    connections.delete(connectionId);
  };

  return response;
});

async function handleMessage(
  connectionId: string, 
  message: any, 
  socket: WebSocket, 
  supabase: any
) {
  const { type, sessionId, data } = message;

  switch (type) {
    case 'join_session':
      await handleJoinSession(connectionId, sessionId, data, socket, supabase);
      break;
      
    case 'update_presence':
      await handleUpdatePresence(sessionId, data, supabase);
      break;
      
    case 'add_comment':
      await handleAddComment(sessionId, data, socket, supabase);
      break;
      
    case 'resolve_comment':
      await handleResolveComment(sessionId, data, socket, supabase);
      break;
      
    case 'update_collaborator':
      await handleUpdateCollaborator(sessionId, data, socket, supabase);
      break;
      
    case 'assessment_change':
      await handleAssessmentChange(sessionId, data, socket, supabase);
      break;
      
    case 'cursor_position':
      await broadcastToSession(sessionId, {
        type: 'cursor_update',
        data: { ...data, connectionId },
        timestamp: Date.now()
      }, connectionId);
      break;
      
    default:
      console.warn(`Unknown message type: ${type}`);
  }
}

async function handleJoinSession(
  connectionId: string, 
  sessionId: string, 
  userData: any, 
  socket: WebSocket, 
  supabase: any
) {
  try {
    // Get or create collaborative session
    let { data: session } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from('collaborative_sessions')
        .insert({
          id: sessionId,
          assessment_id: userData.assessmentId,
          created_by: userData.userId
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      session = newSession;
    }

    // Update or create collaborator record
    const { error: collaboratorError } = await supabase
      .from('collaborators')
      .upsert({
        session_id: sessionId,
        user_id: userData.userId,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'viewer',
        status: 'online',
        last_active: new Date().toISOString()
      });

    if (collaboratorError) throw collaboratorError;

    // Log activity
    await supabase
      .from('session_activity')
      .insert({
        session_id: sessionId,
        user_id: userData.userId,
        user_name: userData.name,
        action_type: 'user_joined',
        action_data: { connectionId }
      });

    // Send session data to user
    const { data: collaborators } = await supabase
      .from('collaborators')
      .select('*')
      .eq('session_id', sessionId);

    const { data: comments } = await supabase
      .from('collaborative_comments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    socket.send(JSON.stringify({
      type: 'session_joined',
      data: {
        session,
        collaborators,
        comments
      },
      timestamp: Date.now()
    }));

    // Broadcast user joined to other participants
    await broadcastToSession(sessionId, {
      type: 'user_joined',
      data: {
        userId: userData.userId,
        name: userData.name,
        role: userData.role
      },
      timestamp: Date.now()
    }, connectionId);

  } catch (error) {
    console.error('Error joining session:', error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to join session',
      timestamp: Date.now()
    }));
  }
}

async function handleUpdatePresence(sessionId: string, data: any, supabase: any) {
  try {
    await supabase
      .from('collaborators')
      .update({
        status: data.status,
        last_active: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', data.userId);

    await broadcastToSession(sessionId, {
      type: 'presence_updated',
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

async function handleAddComment(sessionId: string, data: any, socket: WebSocket, supabase: any) {
  try {
    const { data: comment, error } = await supabase
      .from('collaborative_comments')
      .insert({
        session_id: sessionId,
        author_id: data.authorId,
        author_name: data.authorName,
        content: data.content,
        question_id: data.questionId
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase
      .from('session_activity')
      .insert({
        session_id: sessionId,
        user_id: data.authorId,
        user_name: data.authorName,
        action_type: 'comment_added',
        action_data: { commentId: comment.id, questionId: data.questionId }
      });

    await broadcastToSession(sessionId, {
      type: 'comment_added',
      data: comment,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to add comment',
      timestamp: Date.now()
    }));
  }
}

async function handleResolveComment(sessionId: string, data: any, socket: WebSocket, supabase: any) {
  try {
    const { data: comment, error } = await supabase
      .from('collaborative_comments')
      .update({ resolved: data.resolved })
      .eq('id', data.commentId)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;

    await broadcastToSession(sessionId, {
      type: 'comment_resolved',
      data: comment,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error resolving comment:', error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to resolve comment',
      timestamp: Date.now()
    }));
  }
}

async function handleUpdateCollaborator(sessionId: string, data: any, socket: WebSocket, supabase: any) {
  try {
    const { error } = await supabase
      .from('collaborators')
      .update({ role: data.role })
      .eq('session_id', sessionId)
      .eq('id', data.collaboratorId);

    if (error) throw error;

    await broadcastToSession(sessionId, {
      type: 'collaborator_updated',
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error updating collaborator:', error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to update collaborator',
      timestamp: Date.now()
    }));
  }
}

async function handleAssessmentChange(sessionId: string, data: any, socket: WebSocket, supabase: any) {
  try {
    // Update session data
    await supabase
      .from('collaborative_sessions')
      .update({
        session_data: data.changes,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Log activity
    await supabase
      .from('session_activity')
      .insert({
        session_id: sessionId,
        user_id: data.userId,
        user_name: data.userName,
        action_type: 'assessment_changed',
        action_data: { changeType: data.changeType, summary: data.summary }
      });

    await broadcastToSession(sessionId, {
      type: 'assessment_changed',
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error handling assessment change:', error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to sync assessment changes',
      timestamp: Date.now()
    }));
  }
}

async function broadcastToSession(sessionId: string, message: any, excludeConnectionId?: string) {
  // In a real implementation, you'd maintain a mapping of session participants to connections
  // For now, broadcast to all active connections
  connections.forEach((socket, connectionId) => {
    if (connectionId !== excludeConnectionId && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          ...message,
          sessionId
        }));
      } catch (error) {
        console.error(`Error broadcasting to ${connectionId}:`, error);
      }
    }
  });
}