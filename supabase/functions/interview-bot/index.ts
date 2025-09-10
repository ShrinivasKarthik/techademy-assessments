import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openAIKey = Deno.env.get('OPENAI_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade request
  const upgradeHeader = req.headers.get("upgrade");
  console.log('Upgrade header:', upgradeHeader);
  
  if (upgradeHeader?.toLowerCase() === "websocket") {
    console.log('Handling WebSocket upgrade...');
    return handleWebSocketConnection(req);
  }

  // Return 406 for non-WebSocket requests to maintain consistency
  return new Response('WebSocket connection required', { 
    status: 406,
    headers: corsHeaders 
  });
});

function handleWebSocketConnection(req: Request) {
  console.log('Creating WebSocket connection...');
  
  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    console.log('WebSocket upgrade successful');
    
    let sessionId: string | null = null;
    let interviewType: string = 'behavioral';
    let heartbeatInterval: number | null = null;

    socket.onopen = () => {
      console.log('WebSocket connection opened');
      
      // Start heartbeat immediately
      heartbeatInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ 
              type: 'heartbeat',
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Heartbeat send failed:', error);
          }
        }
      }, 30000);
      
      // Send immediate connection ready signal
      socket.send(JSON.stringify({ 
        type: 'connection_ready',
        timestamp: Date.now()
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data.type, data);

        // Handle session initialization
        if (data.type === 'init_session') {
          sessionId = data.data?.sessionId;
          interviewType = data.data?.interview_type || 'behavioral';
          
          console.log(`Initializing session: ${sessionId}, type: ${interviewType}`);
          
          if (!sessionId) {
            socket.send(JSON.stringify({
              type: 'session_error',
              error: 'No session ID provided'
            }));
            return;
          }

          // Verify session exists and update state
          const { data: session, error } = await supabase
            .from('interview_sessions')
            .select('id, current_state')
            .eq('id', sessionId)
            .single();

          if (error || !session) {
            console.error('Session verification failed:', error);
            socket.send(JSON.stringify({
              type: 'session_error',
              error: 'Session not found. Please refresh and try again.'
            }));
            return;
          }

          // Update session to active state
          await supabase
            .from('interview_sessions')
            .update({ current_state: 'active' })
            .eq('id', sessionId);

          socket.send(JSON.stringify({
            type: 'session_ready',
            sessionId: sessionId,
            timestamp: Date.now()
          }));
          
          return;
        }

        // Ensure session is initialized
        if (!sessionId) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Session not initialized'
          }));
          return;
        }

        // Handle heartbeat pong
        if (data.type === 'pong') {
          console.log('Received heartbeat pong');
          return;
        }

        // Handle text messages
        if (data.type === 'text_message') {
          const message = data.data?.message;
          if (!message) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'No message content'
            }));
            return;
          }

          console.log(`Processing text message for session ${sessionId}:`, message);
          
          const response = await processUserMessage(message, sessionId, interviewType);
          
          socket.send(JSON.stringify({
            type: 'ai_response',
            data: { content: response },
            timestamp: Date.now()
          }));
          return;
        }

        // Handle audio messages
        if (data.type === 'audio_message') {
          const audioData = data.data?.audio_data;
          if (!audioData) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'No audio data provided'
            }));
            return;
          }

          console.log(`Processing audio message for session ${sessionId}`);
          
          // Transcribe audio
          const transcript = await transcribeAudio(audioData);
          if (!transcript) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'Failed to transcribe audio'
            }));
            return;
          }

          console.log('Transcription result:', transcript);
          
          // Process transcribed message
          const response = await processUserMessage(transcript, sessionId, interviewType);
          
          // Send text response with transcription
          socket.send(JSON.stringify({
            type: 'ai_response',
            data: { 
              content: response,
              transcription: transcript
            },
            timestamp: Date.now()
          }));

          // Generate speech response
          const audioResponse = await generateSpeechResponse(response);
          if (audioResponse) {
            socket.send(JSON.stringify({
              type: 'audio_response',
              data: { audio: audioResponse },
              timestamp: Date.now()
            }));
          }
          return;
        }

        // Unknown message type
        console.warn('Unknown message type:', data.type);
        socket.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${data.type}`
        }));

      } catch (error) {
        console.error('Message processing error:', error);
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      if (sessionId) {
        console.log(`Session ${sessionId} disconnected`);
      }
    };

    return response;
    
  } catch (error) {
    console.error('WebSocket upgrade failed:', error);
    return new Response('WebSocket upgrade failed', { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

async function processUserMessage(message: string, sessionId: string, interviewType: string): Promise<string> {
  try {
    // Save user message
    await supabase.from('interview_responses').insert({
      session_id: sessionId,
      speaker: 'user',
      content: message,
      message_type: 'text'
    });

    // Get conversation history
    const { data: history } = await supabase
      .from('interview_responses')
      .select('speaker, content')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    // Generate AI response
    const response = await generateAIResponse(message, interviewType, history || []);
    
    // Save AI response
    await supabase.from('interview_responses').insert({
      session_id: sessionId,
      speaker: 'assistant',
      content: response,
      message_type: 'text'
    });

    return response;

  } catch (error) {
    console.error('Error processing user message:', error);
    throw new Error('Failed to process message');
  }
}

async function generateAIResponse(
  userMessage: string,
  interviewType: string,
  conversationHistory: any[]
): Promise<string> {
  const systemPrompt = getSystemPrompt(interviewType);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.speaker === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error('Failed to generate AI response');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function getSystemPrompt(interviewType: string): string {
  const basePrompt = `You are an experienced interviewer conducting a ${interviewType} interview. Be professional, engaging, and ask relevant follow-up questions.`;
  
  const typeSpecificPrompts = {
    technical: `Focus on technical skills, problem-solving abilities, and coding knowledge. Ask about specific technologies and real-world scenarios.`,
    behavioral: `Focus on past experiences and soft skills. Use the STAR method to guide responses. Ask about teamwork, leadership, and problem-solving.`,
    situational: `Present hypothetical scenarios and ask how the candidate would handle them. Focus on decision-making and ethical considerations.`
  };

  return `${basePrompt}\n\n${typeSpecificPrompts[interviewType] || typeSpecificPrompts.behavioral}\n\nKeep responses concise and ask one question at a time.`;
}

async function transcribeAudio(audioBase64: string): Promise<string | null> {
  try {
    const binaryAudio = atob(audioBase64);
    const audioBytes = new Uint8Array(binaryAudio.length);
    for (let i = 0; i < binaryAudio.length; i++) {
      audioBytes[i] = binaryAudio.charCodeAt(i);
    }

    const formData = new FormData();
    const blob = new Blob([audioBytes], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error('Transcription error:', await response.text());
      return null;
    }

    const result = await response.json();
    return result.text;

  } catch (error) {
    console.error('Audio transcription error:', error);
    return null;
  }
}

async function generateSpeechResponse(text: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      console.error('Speech generation error:', await response.text());
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64Audio;

  } catch (error) {
    console.error('Speech generation error:', error);
    return null;
  }
}