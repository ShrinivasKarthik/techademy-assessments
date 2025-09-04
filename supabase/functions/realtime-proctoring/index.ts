import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store for active connections
const connections = new Map<string, WebSocket>();
const monitoringSessions = new Map<string, any>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  try {
    console.log("Upgrading to WebSocket connection");
    
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connectionId = crypto.randomUUID();
    
    socket.onopen = () => {
      console.log(`WebSocket connection opened: ${connectionId}`);
      connections.set(connectionId, socket);
      
      // Send connection confirmation
      socket.send(JSON.stringify({
        type: 'connection_established',
        data: { connectionId },
        timestamp: Date.now()
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`Received message from ${connectionId}:`, message);
        
        handleMessage(connectionId, message, socket);
      } catch (error) {
        console.error("Error parsing message:", error);
        socket.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: Date.now()
        }));
      }
    };

    socket.onclose = () => {
      console.log(`WebSocket connection closed: ${connectionId}`);
      connections.delete(connectionId);
      
      // Clean up monitoring session if exists
      if (monitoringSessions.has(connectionId)) {
        monitoringSessions.delete(connectionId);
      }
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
    };

    return response;
  } catch (error) {
    console.error("Error upgrading to WebSocket:", error);
    return new Response("Failed to upgrade to WebSocket", { 
      status: 500,
      headers: corsHeaders 
    });
  }
});

function handleMessage(connectionId: string, message: any, socket: WebSocket) {
  const { type, data } = message;

  switch (type) {
    case 'auth':
      handleAuth(connectionId, data, socket);
      break;
      
    case 'start_monitoring':
      handleStartMonitoring(connectionId, data, socket);
      break;
      
    case 'stop_monitoring':
      handleStopMonitoring(connectionId, socket);
      break;
      
    case 'participant_activity':
      handleParticipantActivity(connectionId, data, socket);
      break;
      
    case 'violation_report':
      handleViolationReport(connectionId, data, socket);
      break;
      
    default:
      console.log(`Unknown message type: ${type}`);
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: `Unknown message type: ${type}` },
        timestamp: Date.now()
      }));
  }
}

function handleAuth(connectionId: string, data: any, socket: WebSocket) {
  console.log(`Authentication for ${connectionId}:`, data);
  
  // Store user info for this connection
  const sessionData = {
    userId: data.userId,
    authenticatedAt: Date.now(),
    role: data.role || 'user'
  };
  
  monitoringSessions.set(connectionId, sessionData);
  
  socket.send(JSON.stringify({
    type: 'auth_success',
    data: { authenticated: true },
    timestamp: Date.now()
  }));
}

function handleStartMonitoring(connectionId: string, data: any, socket: WebSocket) {
  console.log(`Starting monitoring for ${connectionId}:`, data);
  
  const session = monitoringSessions.get(connectionId);
  if (!session) {
    socket.send(JSON.stringify({
      type: 'error',
      data: { message: 'Not authenticated' },
      timestamp: Date.now()
    }));
    return;
  }

  // Update session with monitoring info
  session.isMonitoring = true;
  session.assessmentId = data.assessmentId;
  session.monitoringStartedAt = Date.now();
  
  monitoringSessions.set(connectionId, session);
  
  socket.send(JSON.stringify({
    type: 'monitoring_started',
    data: { 
      assessmentId: data.assessmentId,
      startedAt: session.monitoringStartedAt
    },
    timestamp: Date.now()
  }));

  // Simulate periodic activity updates
  simulateActivityUpdates(connectionId, socket);
}

function handleStopMonitoring(connectionId: string, socket: WebSocket) {
  console.log(`Stopping monitoring for ${connectionId}`);
  
  const session = monitoringSessions.get(connectionId);
  if (session) {
    session.isMonitoring = false;
    session.monitoringStoppedAt = Date.now();
    monitoringSessions.set(connectionId, session);
  }
  
  socket.send(JSON.stringify({
    type: 'monitoring_stopped',
    data: { stoppedAt: Date.now() },
    timestamp: Date.now()
  }));
}

function handleParticipantActivity(connectionId: string, data: any, socket: WebSocket) {
  console.log(`Participant activity from ${connectionId}:`, data);
  
  // Broadcast activity to all monitoring connections
  broadcastToMonitors({
    type: 'participant_activity_update',
    data: {
      participantId: data.participantId,
      activity: data.activity,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  }, connectionId);
}

function handleViolationReport(connectionId: string, data: any, socket: WebSocket) {
  console.log(`Violation report from ${connectionId}:`, data);
  
  // Broadcast violation to all monitoring connections
  broadcastToMonitors({
    type: 'violation_detected',
    data: {
      participantId: data.participantId,
      violation: data.violation,
      severity: data.severity || 'medium',
      evidence: data.evidence,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  }, connectionId);
  
  socket.send(JSON.stringify({
    type: 'violation_recorded',
    data: { violationId: crypto.randomUUID() },
    timestamp: Date.now()
  }));
}

function broadcastToMonitors(message: any, excludeConnectionId?: string) {
  monitoringSessions.forEach((session, connectionId) => {
    if (connectionId === excludeConnectionId) return;
    if (!session.isMonitoring) return;
    
    const socket = connections.get(connectionId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
}

function simulateActivityUpdates(connectionId: string, socket: WebSocket) {
  const session = monitoringSessions.get(connectionId);
  if (!session || !session.isMonitoring) return;

  // Simulate random activity updates
  const activities = [
    'question_answered',
    'tab_focus_lost',
    'tab_focus_gained',
    'mouse_activity',
    'keyboard_activity',
    'copy_paste_detected',
    'fullscreen_exit'
  ];

  const sendRandomActivity = () => {
    if (!session.isMonitoring) return;
    
    const activity = activities[Math.floor(Math.random() * activities.length)];
    const participantId = `participant_${Math.floor(Math.random() * 3) + 1}`;
    
    socket.send(JSON.stringify({
      type: 'participant_activity',
      data: {
        participantId,
        activity,
        details: `Simulated ${activity} event`,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    }));
    
    // Schedule next update
    setTimeout(sendRandomActivity, Math.random() * 10000 + 5000); // 5-15 seconds
  };

  // Start after 2 seconds
  setTimeout(sendRandomActivity, 2000);
}

console.log("Real-time proctoring WebSocket server started");