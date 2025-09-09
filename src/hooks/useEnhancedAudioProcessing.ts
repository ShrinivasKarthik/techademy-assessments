import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AudioProcessingState {
  isRecording: boolean;
  isProcessing: boolean;
  hasPermission: boolean;
  audioLevel: number;
}

export const useEnhancedAudioProcessing = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AudioProcessingState>({
    isRecording: false,
    isProcessing: false,
    hasPermission: false,
    audioLevel: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const levelCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Test the stream and close it
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({ ...prev, hasPermission: true }));
      return true;
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
      
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice features",
        variant: "destructive",
      });
      
      setState(prev => ({ ...prev, hasPermission: false }));
      return false;
    }
  }, [toast]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      // Request fresh stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Set up audio context and analyzer for level monitoring
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      
      analyzerRef.current.fftSize = 256;
      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Monitor audio levels
      const checkAudioLevel = () => {
        if (analyzerRef.current) {
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setState(prev => ({ ...prev, audioLevel: average / 255 }));
        }
      };

      levelCheckIntervalRef.current = setInterval(checkAudioLevel, 100);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setState(prev => ({ ...prev, isRecording: false, isProcessing: false }));
        
        if (levelCheckIntervalRef.current) {
          clearInterval(levelCheckIntervalRef.current);
          levelCheckIntervalRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive",
        });
        
        stopRecording();
      };

      // Start recording
      mediaRecorderRef.current.start();
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isProcessing: false,
        hasPermission: true 
      }));

      return true;

    } catch (error) {
      console.error('Failed to start recording:', error);
      
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
      
      setState(prev => ({ ...prev, isProcessing: false, hasPermission: false }));
      return false;
    }
  }, [toast]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !state.isRecording) {
        resolve(null);
        return;
      }

      const handleStop = () => {
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Clean up audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(console.error);
          audioContextRef.current = null;
        }

        // Clean up level monitoring
        if (levelCheckIntervalRef.current) {
          clearInterval(levelCheckIntervalRef.current);
          levelCheckIntervalRef.current = null;
        }

        // Create final blob
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          isProcessing: false,
          audioLevel: 0 
        }));
        
        resolve(audioBlob);
      };

      // Set up one-time event listener
      mediaRecorderRef.current.addEventListener('stop', handleStop, { once: true });
      
      // Stop recording
      mediaRecorderRef.current.stop();
    });
  }, [state.isRecording]);

  const convertBlobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result?.toString();
        if (result) {
          // Remove data URL prefix to get just base64
          const base64 = result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert audio to base64'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read audio file'));
      };
      
      reader.readAsDataURL(blob);
    });
  }, []);

  const cleanup = useCallback(() => {
    // Stop recording if active
    if (state.isRecording) {
      stopRecording();
    }

    // Clean up all resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    if (levelCheckIntervalRef.current) {
      clearInterval(levelCheckIntervalRef.current);
      levelCheckIntervalRef.current = null;
    }

    setState({
      isRecording: false,
      isProcessing: false,
      hasPermission: false,
      audioLevel: 0
    });
  }, [state.isRecording, stopRecording]);

  return {
    ...state,
    requestPermissions,
    startRecording,
    stopRecording,
    convertBlobToBase64,
    cleanup
  };
};