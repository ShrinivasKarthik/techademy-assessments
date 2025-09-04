import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, Square, Play, Pause, Trash2, Download } from 'lucide-react';

interface AudioQuestionProps {
  question: {
    id: string;
    title: string;
    description: string;
    config: {
      maxDurationSeconds?: number;
      allowRerecording?: boolean;
      instructions?: string;
    };
  };
  answer?: {
    audioUrl?: string;
    duration?: number;
    recordedAt?: string;
  };
  onAnswerChange: (answer: any) => void;
  disabled?: boolean;
}

const AudioQuestion: React.FC<AudioQuestionProps> = ({
  question,
  answer,
  onAnswerChange,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const maxDuration = question.config.maxDurationSeconds || 300; // 5 minutes default
  const allowRerecording = question.config.allowRerecording !== false;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Create URL for playback
        const audioUrl = URL.createObjectURL(blob);
        
        onAnswerChange({
          audioUrl,
          duration: recordingTime,
          recordedAt: new Date().toISOString()
        });

        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      
      // Start playback timer
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const deleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioBlob(null);
    setPlaybackTime(0);
    setRecordingTime(0);
    setIsPlaying(false);
    
    onAnswerChange({
      audioUrl: undefined,
      duration: undefined,
      recordedAt: undefined
    });
  };

  const downloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasRecording = answer?.audioUrl || audioBlob;

  return (
    <div className="space-y-4">
      {/* Instructions */}
      {question.config.instructions && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">{question.config.instructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Recording Controls */}
      <Card>
        <CardContent className="p-6">
          {!hasRecording ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-20 h-20 mx-auto bg-primary/10 rounded-full">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Record Your Response</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Maximum duration: {formatTime(maxDuration)}
                </p>
                
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    disabled={disabled}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-mono text-lg text-red-600">
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    
                    <Progress 
                      value={(recordingTime / maxDuration) * 100} 
                      className="h-2"
                    />
                    
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Audio Player */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? pauseAudio : playAudio}
                  disabled={disabled}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatTime(playbackTime)}</span>
                    <span>{formatTime(answer?.duration || recordingTime)}</span>
                  </div>
                  <Progress 
                    value={(playbackTime / (answer?.duration || recordingTime)) * 100}
                    className="h-2"
                  />
                </div>
              </div>

              {/* Recording Info */}
              <div className="text-center space-y-2">
                <Badge variant="secondary">
                  Duration: {formatTime(answer?.duration || recordingTime)}
                </Badge>
                {answer?.recordedAt && (
                  <p className="text-xs text-muted-foreground">
                    Recorded: {new Date(answer.recordedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAudio}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                {allowRerecording && !disabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteRecording}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete & Re-record
                  </Button>
                )}
              </div>

              {/* Hidden audio element for playback */}
              <audio
                ref={audioRef}
                src={answer?.audioUrl}
                onEnded={() => {
                  setIsPlaying(false);
                  setPlaybackTime(0);
                  if (playbackIntervalRef.current) {
                    clearInterval(playbackIntervalRef.current);
                    playbackIntervalRef.current = null;
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    // Update duration if not already set
                    if (!answer?.duration) {
                      onAnswerChange({
                        ...answer,
                        duration: audioRef.current.duration
                      });
                    }
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioQuestion;