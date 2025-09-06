import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

async function handleStartMonitoring(connectionId: string, data: any, socket: WebSocket) {
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

  // Check for active public sessions to determine monitoring mode
  const { data: publicSessions, error } = await supabase
    .from('assessment_instances')
    .select('id, assessment_id')
    .eq('is_anonymous', true)
    .eq('status', 'in_progress')
    .not('share_token', 'is', null);

  const publicSessionCount = publicSessions?.length || 0;
  const monitoringMode = data.mode || (publicSessionCount > 0 ? 'resource_safe' : 'normal');
  
  console.log(`Monitoring mode determined: ${monitoringMode} (${publicSessionCount} public sessions active)`);

  // Update session with monitoring info and resource coordination
  session.isMonitoring = true;
  session.assessmentIds = data.assessmentIds || [data.assessmentId];
  session.monitoringType = data.monitoringType || 'standard';
  session.monitoringMode = monitoringMode;
  session.monitoringStartedAt = Date.now();
  session.publicSessionCount = publicSessionCount;
  
  monitoringSessions.set(connectionId, session);
  
  socket.send(JSON.stringify({
    type: 'monitoring_started',
    data: { 
      assessmentIds: session.assessmentIds,
      monitoringType: session.monitoringType,
      monitoringMode: monitoringMode,
      publicSessionsDetected: publicSessionCount,
      startedAt: session.monitoringStartedAt
    },
    timestamp: Date.now()
  }));

  // Adjust monitoring intensity based on mode
  if (session.monitoringType === 'live_assessment') {
    simulateEnhancedMonitoringUpdates(connectionId, socket, monitoringMode);
  } else {
    simulateActivityUpdates(connectionId, socket, monitoringMode);
  }
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

async function handleViolationReport(connectionId: string, data: any, socket: WebSocket) {
  console.log(`Violation report from ${connectionId}:`, data);
  
  const violationId = crypto.randomUUID();
  const violationData = {
    id: violationId,
    participantId: data.participantId,
    assessmentId: data.assessmentId,
    type: data.event?.type || data.violation?.type || 'unknown',
    severity: data.event?.severity || data.severity || 'medium',
    description: data.event?.description || data.violation?.description || 'Security violation detected',
    evidence: data.evidence,
    timestamp: new Date().toISOString()
  };

  try {
    // Store violation in database
    await storeViolationInDatabase(violationData);
    
    // Broadcast violation to all monitoring connections
    broadcastToMonitors({
      type: 'violation_detected',
      data: violationData,
      timestamp: Date.now()
    }, connectionId);
    
    socket.send(JSON.stringify({
      type: 'violation_recorded',
      data: { violationId, stored: true },
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error storing violation:', error);
    
    // Still broadcast but mark as not stored
    broadcastToMonitors({
      type: 'violation_detected',
      data: violationData,
      timestamp: Date.now()
    }, connectionId);
    
    socket.send(JSON.stringify({
      type: 'violation_recorded',
      data: { violationId, stored: false, error: error.message },
      timestamp: Date.now()
    }));
  }
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

function simulateActivityUpdates(connectionId: string, socket: WebSocket, mode: string = 'normal') {
  const session = monitoringSessions.get(connectionId);
  if (!session || !session.isMonitoring) return;

  // Adjust update frequency based on monitoring mode
  const baseInterval = mode === 'minimal' ? 20000 : mode === 'resource_safe' ? 15000 : 10000;
  const varianceMs = mode === 'minimal' ? 15000 : mode === 'resource_safe' ? 10000 : 5000;

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
        details: `Simulated ${activity} event (${mode} mode)`,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    }));
    
    // Schedule next update with mode-appropriate interval
    const nextInterval = baseInterval + (Math.random() * varianceMs);
    setTimeout(sendRandomActivity, nextInterval);
  };

  // Start after initial delay
  const initialDelay = mode === 'minimal' ? 10000 : mode === 'resource_safe' ? 5000 : 2000;
  setTimeout(sendRandomActivity, initialDelay);
}

function simulateEnhancedMonitoringUpdates(connectionId: string, socket: WebSocket, mode: string = 'normal') {
  const session = monitoringSessions.get(connectionId);
  if (!session || !session.isMonitoring) return;

  // Adjust monitoring intensity based on mode
  const updateInterval = mode === 'minimal' ? 30000 : mode === 'resource_safe' ? 15000 : 8000;
  const variance = mode === 'minimal' ? 20000 : mode === 'resource_safe' ? 10000 : 5000;

  const enhancedEvents = [
    'progress_update',
    'security_check', 
    'network_status',
    'device_info',
    'proctoring_status'
  ];

  // Reduce event types in resource-safe modes
  const availableEvents = mode === 'minimal' 
    ? ['progress_update', 'security_check']
    : mode === 'resource_safe'
    ? ['progress_update', 'security_check', 'network_status']
    : enhancedEvents;

  const sendEnhancedUpdate = () => {
    if (!session.isMonitoring) return;
    
    const eventType = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    const assessmentId = session.assessmentIds[Math.floor(Math.random() * session.assessmentIds.length)];
    
    let eventData = {
      assessmentId,
      monitoringMode: mode,
      timestamp: Date.now()
    };

    switch (eventType) {
      case 'progress_update':
        eventData = {
          ...eventData,
          participantProgress: Math.floor(Math.random() * 100),
          currentQuestion: Math.floor(Math.random() * 10) + 1,
          timeRemaining: Math.floor(Math.random() * 3600)
        };
        break;
      case 'security_check':
        eventData = {
          ...eventData,
          securityStatus: Math.random() > 0.9 ? 'violation' : 'normal', // Reduced false positives in safe mode
          cameraStatus: Math.random() > 0.05,
          microphoneStatus: Math.random() > 0.05
        };
        break;
      case 'network_status':
        eventData = {
          ...eventData,
          connectionQuality: ['excellent', 'good', 'poor'][Math.floor(Math.random() * 3)],
          latency: Math.floor(Math.random() * 100) + 20
        };
        break;
    }
    
    socket.send(JSON.stringify({
      type: 'enhanced_monitoring_update',
      eventType,
      data: eventData,
      timestamp: Date.now()
    }));
    
    // Schedule next update with mode-appropriate timing
    const nextInterval = updateInterval + (Math.random() * variance);
    setTimeout(sendEnhancedUpdate, nextInterval);
  };

  // Start enhanced monitoring updates with initial delay
  const initialDelay = mode === 'minimal' ? 5000 : mode === 'resource_safe' ? 3000 : 1000;
  setTimeout(sendEnhancedUpdate, initialDelay);
}

async function storeViolationInDatabase(violationData: any) {
  const { participantId, assessmentId, type, severity, description, evidence, timestamp } = violationData;
  
  // Find the assessment instance
  const { data: instances, error: instanceError } = await supabase
    .from('assessment_instances')
    .select('id')
    .eq('assessment_id', assessmentId)
    .or(`participant_id.eq.${participantId},participant_id.is.null`)
    .order('started_at', { ascending: false })
    .limit(1);

  if (instanceError) {
    console.error('Error finding assessment instance:', instanceError);
    throw instanceError;
  }

  if (!instances || instances.length === 0) {
    console.error('No assessment instance found for participant:', participantId);
    throw new Error('Assessment instance not found');
  }

  const instanceId = instances[0].id;

  // Find or create proctoring session
  let proctoringSessionId;
  const { data: existingSessions, error: sessionFindError } = await supabase
    .from('proctoring_sessions')
    .select('id')
    .eq('assessment_instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sessionFindError) {
    console.error('Error finding proctoring session:', sessionFindError);
    throw sessionFindError;
  }

  if (existingSessions && existingSessions.length > 0) {
    proctoringSessionId = existingSessions[0].id;
  } else {
    // Create new proctoring session
    const { data: newSession, error: sessionCreateError } = await supabase
      .from('proctoring_sessions')
      .insert({
        assessment_instance_id: instanceId,
        participant_id: participantId,
        status: 'active',
        security_events: [],
        monitoring_data: {}
      })
      .select('id')
      .single();

    if (sessionCreateError) {
      console.error('Error creating proctoring session:', sessionCreateError);
      throw sessionCreateError;
    }

    proctoringSessionId = newSession.id;
  }

  // Add violation to proctoring session
  const { error: updateSessionError } = await supabase.rpc('update_proctoring_session_events', {
    session_id: proctoringSessionId,
    new_event: {
      id: violationData.id,
      type,
      severity,
      description,
      evidence,
      timestamp
    }
  });

  if (updateSessionError) {
    console.error('Error updating proctoring session:', updateSessionError);
    
    // Fallback: try direct update
    const { data: currentSession } = await supabase
      .from('proctoring_sessions')
      .select('security_events')
      .eq('id', proctoringSessionId)
      .single();

    const currentEvents = currentSession?.security_events || [];
    const updatedEvents = [...currentEvents, {
      id: violationData.id,
      type,
      severity,
      description,
      evidence,
      timestamp
    }];

    await supabase
      .from('proctoring_sessions')
      .update({ security_events: updatedEvents })
      .eq('id', proctoringSessionId);
  }

  // Update assessment instance violations and integrity score
  const { data: currentInstance } = await supabase
    .from('assessment_instances')
    .select('proctoring_violations, integrity_score')
    .eq('id', instanceId)
    .single();

  const currentViolations = currentInstance?.proctoring_violations || [];
  const updatedViolations = [...currentViolations, violationData];
  
  // Calculate new integrity score
  const severityWeights = { low: 1, medium: 3, high: 7, critical: 15 };
  const totalDeduction = updatedViolations.reduce((total, v) => 
    total + (severityWeights[v.severity] || 3), 0
  );
  const newIntegrityScore = Math.max(0, 100 - totalDeduction);

  await supabase
    .from('assessment_instances')
    .update({
      proctoring_violations: updatedViolations,
      integrity_score: newIntegrityScore
    })
    .eq('id', instanceId);

  console.log(`Violation stored successfully: ${type} (${severity}) for participant ${participantId}`);
}

console.log("Real-time proctoring WebSocket server started");