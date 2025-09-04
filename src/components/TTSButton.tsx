import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, Square } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface TTSButtonProps {
  text: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const TTSButton: React.FC<TTSButtonProps> = ({
  text,
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = false
}) => {
  const { speak, pause, resume, stop, isSpeaking, isPaused, isSupported } = useTextToSpeech();

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (!isSpeaking) {
      speak(text);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  const getIcon = () => {
    if (!isSpeaking) return <Volume2 className="h-4 w-4" />;
    if (isPaused) return <Play className="h-4 w-4" />;
    return <Pause className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (!isSpeaking) return 'Read aloud';
    if (isPaused) return 'Resume';
    return 'Pause';
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
        title={getLabel()}
      >
        {getIcon()}
        {showLabel && <span className="ml-1">{getLabel()}</span>}
      </Button>
      
      {isSpeaking && (
        <Button
          variant="outline"
          size={size}
          onClick={handleStop}
          title="Stop reading"
        >
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TTSButton;