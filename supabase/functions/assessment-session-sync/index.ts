import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebSocketClient {
  socket: WebSocket;
  participantId?: string;
  assessmentId?: string;
  role?: 'participant' | 'monitor';
  sessionId?: string;
}

const clients = new Map<string, WebSocketClient>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = crypto.randomUUID();
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`New WebSocket connection: ${clientId}`);

  socket.onopen = () => {
    clients.set(clientId, { socket });
    console.log(`Client ${clientId} connected`);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      await handleMessage(clientId, message, supabase);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  };

  socket.onclose = () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  };

  return response;
});

async function handleMessage(clientId: string, message: any, supabase: any) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'register':
      await handleRegister(clientId, message, client);
      break;
    
    case 'session_update':
      await handleSessionUpdate(clientId, message, client, supabase);
      break;
    
    case 'proctoring_event':
      await handleProctoringEvent(clientId, message, client, supabase);
      break;
    
    case 'question_navigation':
      await handleQuestionNavigation(clientId, message, client, supabase);
      break;
    
    case 'timer_sync':
      await handleTimerSync(clientId, message, client, supabase);
      break;
    
    case 'monitor_request':
      await handleMonitorRequest(clientId, message, client);
      break;
    
    default:
      console.log(`Unknown message type: ${message.type}`);
  }
}

async function handleRegister(clientId: string, message: any, client: WebSocketClient) {
  const { participantId, assessmentId, role, sessionId } = message;
  
  client.participantId = participantId;
  client.assessmentId = assessmentId;
  client.role = role;
  client.sessionId = sessionId;
  
  clients.set(clientId, client);
  
  client.socket.send(JSON.stringify({
    type: 'registered',
    clientId,
    success: true
  }));
  
  console.log(`Client ${clientId} registered as ${role} for assessment ${assessmentId}`);
}

async function handleSessionUpdate(clientId: string, message: any, client: WebSocketClient, supabase: any) {
  const { sessionState, timeRemaining, currentQuestionIndex } = message;
  
  // Update database
  try {
    const { error } = await supabase
      .from('assessment_instances')
      .update({
        session_state: sessionState,
        time_remaining_seconds: timeRemaining,
        current_question_index: currentQuestionIndex
      })
      .eq('assessment_id', client.assessmentId)
      .eq('participant_id', client.participantId);
    
    if (error) {
      console.error('Error updating session:', error);
      return;
    }
    
    // Broadcast to monitors
    broadcastToMonitors(client.assessmentId!, {
      type: 'session_updated',
      participantId: client.participantId,
      sessionState,
      timeRemaining,
      currentQuestionIndex,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error handling session update:', error);
  }
}

async function handleProctoringEvent(clientId: string, message: any, client: WebSocketClient, supabase: any) {
  const { event } = message;
  
  try {
    // Store proctoring event
    const { error: sessionError } = await supabase
      .from('proctoring_sessions')
      .update({
        security_events: supabase.sql`security_events || ${JSON.stringify([event])}`
      })
      .eq('participant_id', client.participantId);
    
    // Update assessment instance with violation
    const { error: instanceError } = await supabase
      .from('assessment_instances')
      .update({
        proctoring_violations: supabase.sql`proctoring_violations || ${JSON.stringify([event])}`
      })
      .eq('assessment_id', client.assessmentId)
      .eq('participant_id', client.participantId);
    
    if (sessionError || instanceError) {
      console.error('Error storing proctoring event:', sessionError || instanceError);
      return;
    }
    
    // Broadcast to monitors
    broadcastToMonitors(client.assessmentId!, {
      type: 'proctoring_event',
      participantId: client.participantId,
      event,
      timestamp: new Date().toISOString()
    });
    
    // Auto-pause for critical events
    if (event.severity === 'critical') {
      await supabase
        .from('assessment_instances')
        .update({ session_state: 'paused' })
        .eq('assessment_id', client.assessmentId)
        .eq('participant_id', client.participantId);
      
      // Notify participant
      client.socket.send(JSON.stringify({
        type: 'session_paused',
        reason: 'Critical security violation',
        event
      }));
    }
    
  } catch (error) {
    console.error('Error handling proctoring event:', error);
  }
}

async function handleQuestionNavigation(clientId: string, message: any, client: WebSocketClient, supabase: any) {
  const { questionIndex, timeSpent } = message;
  
  try {
    // Update current question index
    await supabase
      .from('assessment_instances')
      .update({ current_question_index: questionIndex })
      .eq('assessment_id', client.assessmentId)
      .eq('participant_id', client.participantId);
    
    // Broadcast to monitors
    broadcastToMonitors(client.assessmentId!, {
      type: 'question_navigation',
      participantId: client.participantId,
      questionIndex,
      timeSpent,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error handling question navigation:', error);
  }
}

async function handleTimerSync(clientId: string, message: any, client: WebSocketClient, supabase: any) {
  const { timeRemaining } = message;
  
  try {
    // Update time remaining
    await supabase
      .from('assessment_instances')
      .update({ time_remaining_seconds: timeRemaining })
      .eq('assessment_id', client.assessmentId)
      .eq('participant_id', client.participantId);
    
    // Broadcast to monitors
    broadcastToMonitors(client.assessmentId!, {
      type: 'timer_update',
      participantId: client.participantId,
      timeRemaining,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error handling timer sync:', error);
  }
}

async function handleMonitorRequest(clientId: string, message: any, client: WebSocketClient) {
  const { action, targetParticipantId } = message;
  
  // Find participant client
  const participantClient = Array.from(clients.values()).find(
    c => c.participantId === targetParticipantId && c.role === 'participant'
  );
  
  if (participantClient) {
    participantClient.socket.send(JSON.stringify({
      type: 'monitor_action',
      action,
      timestamp: new Date().toISOString()
    }));
  }
}

function broadcastToMonitors(assessmentId: string, message: any) {
  Array.from(clients.values())
    .filter(client => client.assessmentId === assessmentId && client.role === 'monitor')
    .forEach(client => {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting to monitor:', error);
      }
    });
}

function broadcastToParticipants(assessmentId: string, message: any) {
  Array.from(clients.values())
    .filter(client => client.assessmentId === assessmentId && client.role === 'participant')
    .forEach(client => {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting to participant:', error);
      }
    });
}