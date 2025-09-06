import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WebSocket connections map
const connections = new Map<string, {
  socket: WebSocket;
  sessionId?: string;
  userId?: string;
  role: 'monitor' | 'participant';
  lastActivity: Date;
}>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    // Handle HTTP requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      return handleHTTPRequest(req);
    }

    return new Response("Expected WebSocket connection", { status: 400 });
  }

  // Handle WebSocket connections
  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();

  console.log(`New WebSocket connection: ${connectionId}`);

  socket.onopen = () => {
    connections.set(connectionId, {
      socket,
      role: 'monitor', // Default role
      lastActivity: new Date()
    });

    socket.send(JSON.stringify({
      type: 'connection_established',
      connectionId,
      timestamp: new Date().toISOString()
    }));

    console.log(`WebSocket opened: ${connectionId}`);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      await handleWebSocketMessage(connectionId, message, socket);
    } catch (error) {
      console.error(`Error handling message from ${connectionId}:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  };

  socket.onclose = () => {
    console.log(`WebSocket closed: ${connectionId}`);
    connections.delete(connectionId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    connections.delete(connectionId);
  };

  return response;
});

async function handleHTTPRequest(req: Request) {
  try {
    const body = await req.json();
    const { action, data } = body;

    switch (action) {
      case 'get_active_sessions':
        return getActiveSessions();
      case 'security_violation':
        return handleSecurityViolation(data);
      case 'performance_alert':
        return handlePerformanceAlert(data);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('HTTP request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleWebSocketMessage(connectionId: string, message: any, socket: WebSocket) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  connection.lastActivity = new Date();

  console.log(`Message from ${connectionId}:`, message);

  switch (message.type) {
    case 'authenticate':
      await handleAuthentication(connectionId, message.data, socket);
      break;
    
    case 'start_monitoring':
      await handleStartMonitoring(connectionId, message.data, socket);
      break;
    
    case 'stop_monitoring':
      await handleStopMonitoring(connectionId, socket);
      break;
    
    case 'participant_activity':
      await handleParticipantActivity(connectionId, message.data);
      break;
    
    case 'security_event':
      await handleSecurityEvent(connectionId, message.data);
      break;
    
    case 'performance_metrics':
      await handlePerformanceMetrics(connectionId, message.data);
      break;
    
    case 'network_status':
      await handleNetworkStatus(connectionId, message.data);
      break;
    
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    
    default:
      socket.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`
      }));
  }
}

async function handleAuthentication(connectionId: string, data: any, socket: WebSocket) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    if (data.userId) {
      const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.userId)
        .single();

      if (user) {
        connection.userId = data.userId;
        connection.role = data.role || 'monitor';
        connection.sessionId = data.sessionId;

        socket.send(JSON.stringify({
          type: 'authentication_success',
          userId: data.userId,
          role: connection.role
        }));

        console.log(`User authenticated: ${data.userId} as ${connection.role}`);
      } else {
        socket.send(JSON.stringify({
          type: 'authentication_failed',
          message: 'Invalid user credentials'
        }));
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    socket.send(JSON.stringify({
      type: 'authentication_failed',
      message: 'Authentication service error'
    }));
  }
}

async function handleStartMonitoring(connectionId: string, data: any, socket: WebSocket) {
  const connection = connections.get(connectionId);
  if (!connection || connection.role !== 'monitor') return;

  console.log(`Starting monitoring for connection ${connectionId}`);

  // Simulate active session monitoring
  const monitoringInterval = setInterval(() => {
    if (!connections.has(connectionId)) {
      clearInterval(monitoringInterval);
      return;
    }

    // Send real-time session updates
    const mockSessionUpdate = {
      type: 'session_update',
      data: {
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        participantName: `User ${Math.floor(Math.random() * 100)}`,
        status: ['active', 'paused', 'flagged'][Math.floor(Math.random() * 3)],
        progress: Math.floor(Math.random() * 100),
        networkStatus: ['stable', 'unstable'][Math.floor(Math.random() * 2)],
        securityScore: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      }
    };

    socket.send(JSON.stringify(mockSessionUpdate));

    // Occasionally send security alerts
    if (Math.random() < 0.1) {
      const securityAlert = {
        type: 'security_violation',
        data: {
          sessionId: `session_${Math.floor(Math.random() * 1000)}`,
          type: ['tab-switch', 'camera-off', 'suspicious-typing'][Math.floor(Math.random() * 3)],
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
          description: 'Potential security violation detected',
          timestamp: new Date().toISOString()
        }
      };
      socket.send(JSON.stringify(securityAlert));
    }

    // Performance alerts
    if (Math.random() < 0.05) {
      const performanceAlert = {
        type: 'performance_alert',
        data: {
          sessionId: `session_${Math.floor(Math.random() * 1000)}`,
          metric: 'typing_speed',
          value: Math.floor(Math.random() * 200),
          threshold: 150,
          message: 'Unusual typing speed detected',
          timestamp: new Date().toISOString()
        }
      };
      socket.send(JSON.stringify(performanceAlert));
    }
  }, 5000); // Update every 5 seconds

  socket.send(JSON.stringify({
    type: 'monitoring_started',
    message: 'Real-time monitoring activated'
  }));
}

async function handleStopMonitoring(connectionId: string, socket: WebSocket) {
  console.log(`Stopping monitoring for connection ${connectionId}`);
  
  socket.send(JSON.stringify({
    type: 'monitoring_stopped',
    message: 'Real-time monitoring deactivated'
  }));
}

async function handleParticipantActivity(connectionId: string, data: any) {
  // Broadcast activity to all monitors
  const activityMessage = {
    type: 'participant_activity',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      connectionId
    }
  };

  broadcastToMonitors(activityMessage);
}

async function handleSecurityEvent(connectionId: string, data: any) {
  console.log(`Security event from ${connectionId}:`, data);

  const securityEvent = {
    type: 'security_event',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      connectionId,
      processed: false
    }
  };

  // Store security event (in real implementation, save to database)
  await storeSecurityEvent(securityEvent);

  // Broadcast to monitors with priority based on severity
  broadcastToMonitors(securityEvent, data.severity === 'critical');

  // Auto-response for critical events
  if (data.severity === 'critical') {
    await handleCriticalSecurityEvent(data);
  }
}

async function handlePerformanceMetrics(connectionId: string, data: any) {
  const performanceData = {
    type: 'performance_metrics',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      connectionId
    }
  };

  // Analyze performance metrics for anomalies
  const anomalies = analyzePerformanceAnomalies(data);
  if (anomalies.length > 0) {
    const anomalyAlert = {
      type: 'performance_anomaly',
      data: {
        sessionId: data.sessionId,
        anomalies,
        timestamp: new Date().toISOString()
      }
    };
    broadcastToMonitors(anomalyAlert);
  }

  broadcastToMonitors(performanceData);
}

async function handleNetworkStatus(connectionId: string, data: any) {
  const networkUpdate = {
    type: 'network_status',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      connectionId
    }
  };

  // Check for network issues
  if (data.latency > 500 || data.stability < 60) {
    const networkAlert = {
      type: 'network_issue',
      data: {
        sessionId: data.sessionId,
        issue: data.latency > 500 ? 'high_latency' : 'unstable_connection',
        severity: data.latency > 1000 || data.stability < 30 ? 'high' : 'medium',
        timestamp: new Date().toISOString()
      }
    };
    broadcastToMonitors(networkAlert);
  }

  broadcastToMonitors(networkUpdate);
}

function broadcastToMonitors(message: any, priority: boolean = false) {
  const monitors = Array.from(connections.entries())
    .filter(([_, conn]) => conn.role === 'monitor');

  console.log(`Broadcasting to ${monitors.length} monitors:`, message.type);

  monitors.forEach(([connectionId, connection]) => {
    try {
      if (priority) {
        // Add priority flag for critical messages
        message.priority = true;
      }
      connection.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error broadcasting to ${connectionId}:`, error);
      connections.delete(connectionId);
    }
  });
}

async function storeSecurityEvent(event: any) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // In real implementation, store in proctoring_sessions table
    console.log('Storing security event:', event);
    
    // Update proctoring session with new security event
    if (event.data.sessionId) {
      const { error } = await supabase
        .from('proctoring_sessions')
        .update({
          security_events: supabase.sql`security_events || ${JSON.stringify([event.data])}`
        })
        .eq('assessment_instance_id', event.data.sessionId);

      if (error) {
        console.error('Error storing security event:', error);
      }
    }
  } catch (error) {
    console.error('Error in storeSecurityEvent:', error);
  }
}

async function handleCriticalSecurityEvent(data: any) {
  console.log('Handling critical security event:', data);

  // Auto-pause session for critical violations
  if (data.type === 'multiple-faces' || data.type === 'screen-sharing-detected') {
    await pauseAssessmentSession(data.sessionId);
  }

  // Send immediate alert to supervisors
  const criticalAlert = {
    type: 'critical_alert',
    data: {
      ...data,
      action: 'immediate_attention_required',
      autoResponse: 'session_paused',
      timestamp: new Date().toISOString()
    }
  };

  broadcastToMonitors(criticalAlert, true);
}

async function pauseAssessmentSession(sessionId: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('assessment_instances')
      .update({ session_state: 'paused' })
      .eq('id', sessionId);

    if (error) {
      console.error('Error pausing session:', error);
    } else {
      console.log(`Session ${sessionId} paused due to critical security event`);
    }
  } catch (error) {
    console.error('Error in pauseAssessmentSession:', error);
  }
}

function analyzePerformanceAnomalies(data: any) {
  const anomalies = [];

  // Typing speed anomaly detection
  if (data.typingSpeed && (data.typingSpeed > 200 || data.typingSpeed < 10)) {
    anomalies.push({
      type: 'typing_speed',
      value: data.typingSpeed,
      expected: '40-120 WPM',
      severity: data.typingSpeed > 300 ? 'high' : 'medium'
    });
  }

  // Mouse movement pattern anomaly
  if (data.mouseMovement === 'bot-like') {
    anomalies.push({
      type: 'mouse_pattern',
      value: 'non-human',
      expected: 'human-like movement',
      severity: 'high'
    });
  }

  // Focus loss anomaly
  if (data.focusLoss > 10) {
    anomalies.push({
      type: 'focus_loss',
      value: data.focusLoss,
      expected: '< 5 events',
      severity: 'medium'
    });
  }

  return anomalies;
}

async function getActiveSessions() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: sessions } = await supabase
      .from('assessment_instances')
      .select(`
        *,
        assessments(title),
        proctoring_sessions(*)
      `)
      .in('status', ['in_progress', 'proctoring_check']);

    return new Response(JSON.stringify({
      success: true,
      sessions: sessions || [],
      connectionCount: connections.size
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleSecurityViolation(data: any) {
  // Process and store security violation
  await storeSecurityEvent({
    type: 'security_violation',
    data: {
      ...data,
      timestamp: new Date().toISOString()
    }
  });

  // Broadcast to monitors
  broadcastToMonitors({
    type: 'security_violation',
    data
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Security violation processed'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handlePerformanceAlert(data: any) {
  // Process performance alert
  const anomalies = analyzePerformanceAnomalies(data);
  
  broadcastToMonitors({
    type: 'performance_alert',
    data: {
      ...data,
      anomalies,
      timestamp: new Date().toISOString()
    }
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Performance alert processed',
    anomalies
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Cleanup inactive connections every 5 minutes
setInterval(() => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

  connections.forEach((connection, connectionId) => {
    if (connection.lastActivity < cutoff) {
      console.log(`Cleaning up inactive connection: ${connectionId}`);
      connection.socket.close();
      connections.delete(connectionId);
    }
  });

  console.log(`Active connections: ${connections.size}`);
}, 5 * 60 * 1000);