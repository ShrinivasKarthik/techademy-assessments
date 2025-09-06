import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Pause, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TimerComponentProps {
  initialTimeSeconds: number;
  onTimeUpdate?: (timeRemaining: number) => void;
  onTimeExpired?: () => void;
  isPaused?: boolean;
  showWarnings?: boolean;
  className?: string;
}

const TimerComponent: React.FC<TimerComponentProps> = ({
  initialTimeSeconds,
  onTimeUpdate,
  onTimeExpired,
  isPaused = false,
  showWarnings = true,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeSeconds);
  const [isActive, setIsActive] = useState(true);
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    setTimeRemaining(initialTimeSeconds);
  }, [initialTimeSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          onTimeUpdate?.(newTime);

          // Show warning at 5 minutes remaining
          if (showWarnings && !hasWarned && newTime <= 300 && newTime > 0) {
            setHasWarned(true);
          }

          // Time expired
          if (newTime === 0) {
            setIsActive(false);
            onTimeExpired?.();
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, timeRemaining, onTimeUpdate, onTimeExpired, showWarnings, hasWarned]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimeStatus = () => {
    const totalTime = initialTimeSeconds;
    const percentage = (timeRemaining / totalTime) * 100;

    if (timeRemaining === 0) return 'expired';
    if (percentage <= 5) return 'critical'; // Less than 5% remaining
    if (percentage <= 15) return 'warning'; // Less than 15% remaining
    return 'normal';
  };

  const getStatusColor = () => {
    const status = getTimeStatus();
    switch (status) {
      case 'expired':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const togglePause = () => {
    setIsActive(!isActive);
  };

  const status = getTimeStatus();

  return (
    <Card className={`${className} ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {status === 'critical' || status === 'warning' ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="font-mono text-lg font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>

            {status !== 'expired' && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  status === 'critical' ? 'border-red-300 text-red-700' :
                  status === 'warning' ? 'border-yellow-300 text-yellow-700' :
                  'border-green-300 text-green-700'
                }`}
              >
                {status === 'critical' ? 'Time Almost Up!' :
                 status === 'warning' ? 'Time Running Low' :
                 'Time Remaining'}
              </Badge>
            )}

            {status === 'expired' && (
              <Badge variant="destructive" className="text-xs">
                Time Expired
              </Badge>
            )}
          </div>

          {/* Pause/Resume Button (optional feature) */}
          {timeRemaining > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePause}
              className="h-8 w-8 p-0"
            >
              {isActive && !isPaused ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                status === 'critical' ? 'bg-red-500' :
                status === 'warning' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{
                width: `${Math.max(0, (timeRemaining / initialTimeSeconds) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Status Messages */}
        {status === 'expired' && (
          <p className="text-sm mt-2 font-medium">
            Assessment time has expired. Please submit your answers.
          </p>
        )}

        {status === 'critical' && timeRemaining > 0 && (
          <p className="text-sm mt-2 font-medium">
            Less than 5 minutes remaining! Please review and submit your answers.
          </p>
        )}

        {status === 'warning' && timeRemaining > 0 && (
          <p className="text-sm mt-2">
            Time is running low. Please manage your remaining time carefully.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TimerComponent;