import React, { useState } from 'react';
import TouchGestureHandler from './TouchGestureHandler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileAnalyticsGesturesProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  onNextSection?: () => void;
  onPrevSection?: () => void;
}

const MobileAnalyticsGestures: React.FC<MobileAnalyticsGesturesProps> = ({
  children,
  onRefresh,
  onNextSection,
  onPrevSection
}) => {
  const [gestureIndicator, setGestureIndicator] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  const showGestureIndicator = (message: string) => {
    setGestureIndicator(message);
    setTimeout(() => setGestureIndicator(null), 2000);
  };

  const handleSwipeLeft = () => {
    if (onNextSection) {
      onNextSection();
      showGestureIndicator('Next Section');
    }
  };

  const handleSwipeRight = () => {
    if (onPrevSection) {
      onPrevSection();
      showGestureIndicator('Previous Section');
    }
  };

  const handleSwipeDown = () => {
    if (onRefresh) {
      onRefresh();
      showGestureIndicator('Refreshing Data...');
    }
  };

  return (
    <TouchGestureHandler
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onSwipeDown={handleSwipeDown}
      className="relative"
    >
      {children}
      
      {/* Gesture Indicator */}
      {gestureIndicator && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
            <CardContent className="px-4 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">{gestureIndicator}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Gesture Hints */}
      <div className="fixed bottom-4 left-4 right-4 z-40">
        <Card className="bg-background/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>←</span>
                <span>Next</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span>↓</span>
                <span>Refresh</span>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <span>→</span>
                <span>Previous</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TouchGestureHandler>
  );
};

export default MobileAnalyticsGestures;