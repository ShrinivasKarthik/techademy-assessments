import React, { useEffect, useCallback } from 'react';
import { useAssessmentSession } from '@/hooks/useAssessmentSession';
import LiveProctoringSystem from './LiveProctoringSystem';

interface ProctoringIntegrationProps {
  assessmentId: string;
  participantId: string;
  proctoringConfig: any;
  enabled: boolean;
  onSecurityEvent?: (event: any) => void;
  onStatusChange?: (status: string) => void;
}

const ProctoringIntegration: React.FC<ProctoringIntegrationProps> = ({
  assessmentId,
  participantId,
  proctoringConfig,
  enabled,
  onSecurityEvent,
  onStatusChange
}) => {
  const {
    sessionState,
    addSecurityViolation,
    updateSessionState
  } = useAssessmentSession({ assessmentId, participantId });

  const handleSecurityEvent = useCallback(async (event: any) => {
    // Add to session violations
    await addSecurityViolation(event);
    
    // Notify parent component
    onSecurityEvent?.(event);

    // Handle critical events
    if (event.severity === 'critical') {
      await updateSessionState('paused');
    }
  }, [addSecurityViolation, updateSessionState, onSecurityEvent]);

  const handleProctoringStatusChange = useCallback(async (status: 'active' | 'paused' | 'stopped') => {
    // Update proctoring session in database
    try {
      // This would be handled by the LiveProctoringSystem component
      onStatusChange?.(status);
      
      // Automatically start assessment when proctoring becomes active
      if (status === 'active' && sessionState === 'proctoring_check') {
        await updateSessionState('in_progress');
      }
    } catch (error) {
      console.error('Error updating proctoring status:', error);
    }
  }, [sessionState, updateSessionState, onStatusChange]);

  if (!enabled) {
    return null;
  }

  return (
    <LiveProctoringSystem
      assessmentId={assessmentId}
      participantId={participantId}
      config={proctoringConfig}
      onSecurityEvent={handleSecurityEvent}
      onStatusChange={handleProctoringStatusChange}
    />
  );
};

export default ProctoringIntegration;