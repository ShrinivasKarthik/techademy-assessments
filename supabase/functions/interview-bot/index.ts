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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle WebSocket upgrade for voice mode
  const upgradeHeader = req.headers.get("upgrade");
  if (upgradeHeader?.toLowerCase() === "websocket") {
    return handleWebSocketConnection(req);
  }

  // Handle regular HTTP requests for text mode
  try {
    const { session_id, message, interview_type } = await req.json();

    if (!session_id || !message) {
      throw new Error('Missing session_id or message');
    }

    console.log(`Processing message for session ${session_id}:`, message);

    // Get session context
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Session not found');
    }

    // Get conversation history
    const { data: history, error: historyError } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: true });

    if (historyError) {
      console.error('History error:', historyError);
    }

    // Generate AI response
    const response = await generateAIResponse(
      message,
      interview_type || 'behavioral',
      history || [],
      session.evaluation_criteria
    );

    console.log('Generated AI response:', response);

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in interview-bot function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function handleWebSocketConnection(req: Request) {
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let sessionId: string | null = null;
  let interviewType: string = 'behavioral';

  socket.onopen = () => {
    console.log('WebSocket connection opened');
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);

      if (data.type === 'init_session') {
        sessionId = data.session_id;
        interviewType = data.interview_type || 'behavioral';
        console.log(`Session initialized: ${sessionId}, type: ${interviewType}`);
        return;
      }

      if (!sessionId) {
        socket.send(JSON.stringify({ error: 'Session not initialized' }));
        return;
      }

      if (data.type === 'user_message') {
        // Handle text message
        const response = await processUserMessage(data.content, sessionId, interviewType);
        socket.send(JSON.stringify({
          type: 'ai_response',
          content: response
        }));

      } else if (data.type === 'audio_message') {
        // Handle audio message - convert to text first then process
        const transcript = await transcribeAudio(data.audio);
        if (transcript) {
          const response = await processUserMessage(transcript, sessionId, interviewType);
          
          // Generate speech response
          const audioResponse = await generateSpeechResponse(response);
          
          socket.send(JSON.stringify({
            type: 'ai_response',
            content: response
          }));

          if (audioResponse) {
            socket.send(JSON.stringify({
              type: 'audio_response',
              audio: audioResponse
            }));
          }
        }
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
      socket.send(JSON.stringify({ error: error.message }));
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  return response;
}

async function processUserMessage(message: string, sessionId: string, interviewType: string): Promise<string> {
  // Get session context
  const { data: session } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  // Get conversation history
  const { data: history } = await supabase
    .from('interview_responses')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  // Save user message
  await supabase.from('interview_responses').insert({
    session_id: sessionId,
    speaker: 'user',
    message_type: 'text',
    content: message
  });

  // Generate response
  const response = await generateAIResponse(
    message,
    interviewType,
    history || [],
    session?.evaluation_criteria
  );

  // Save AI response
  await supabase.from('interview_responses').insert({
    session_id: sessionId,
    speaker: 'assistant',
    message_type: 'text',
    content: response
  });

  return response;
}

async function generateAIResponse(
  userMessage: string,
  interviewType: string,
  conversationHistory: any[],
  evaluationCriteria: any
): Promise<string> {
  const systemPrompt = getSystemPrompt(interviewType, evaluationCriteria);
  
  // Build conversation context
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
      max_tokens: 500,
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

function getSystemPrompt(interviewType: string, evaluationCriteria: any): string {
  const basePrompt = `You are an experienced interviewer conducting a ${interviewType} interview. Be professional, engaging, and ask relevant follow-up questions based on the candidate's responses.`;
  
  const typeSpecificPrompts = {
    technical: `Focus on technical skills, problem-solving abilities, and coding knowledge. Ask about specific technologies, methodologies, and real-world scenarios. Probe deeper into technical decisions and trade-offs.`,
    behavioral: `Focus on past experiences, soft skills, and how the candidate handles various workplace situations. Use the STAR method (Situation, Task, Action, Result) to guide responses. Ask about teamwork, leadership, and conflict resolution.`,
    situational: `Present hypothetical scenarios and ask how the candidate would handle them. Focus on decision-making processes, prioritization skills, and ethical considerations.`
  };

  let criteriaText = '';
  if (evaluationCriteria?.criteria && evaluationCriteria.criteria.length > 0) {
    criteriaText = `\n\nEvaluation criteria to keep in mind: ${evaluationCriteria.criteria.join(', ')}`;
  }

  return `${basePrompt}\n\n${typeSpecificPrompts[interviewType] || typeSpecificPrompts.behavioral}${criteriaText}\n\nKeep responses concise but thorough. Ask one question at a time and build on previous answers.`;
}

async function transcribeAudio(audioBase64: string): Promise<string | null> {
  try {
    // Convert base64 to binary
    const binaryAudio = atob(audioBase64);
    const audioBytes = new Uint8Array(binaryAudio.length);
    for (let i = 0; i < binaryAudio.length; i++) {
      audioBytes[i] = binaryAudio.charCodeAt(i);
    }

    // Create form data
    const formData = new FormData();
    const blob = new Blob([audioBytes], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    // Send to OpenAI Whisper
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

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    return base64Audio;

  } catch (error) {
    console.error('Speech generation error:', error);
    return null;
  }
}