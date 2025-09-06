/**
 * Monitoring Coordinator Service
 * Manages resource coordination between live monitoring and public assessment access
 */

import { supabase } from '@/integrations/supabase/client';

interface PublicAccessInfo {
  activeCount: number;
  assessmentIds: string[];
  lastChecked: number;
}

interface MonitoringSession {
  id: string;
  mode: 'normal' | 'resource_safe' | 'minimal';
  startedAt: number;
  activeAssessments: string[];
}

class MonitoringCoordinator {
  private static instance: MonitoringCoordinator;
  private publicAccessInfo: PublicAccessInfo = {
    activeCount: 0,
    assessmentIds: [],
    lastChecked: 0
  };
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private checkInterval: number | null = null;

  static getInstance(): MonitoringCoordinator {
    if (!MonitoringCoordinator.instance) {
      MonitoringCoordinator.instance = new MonitoringCoordinator();
    }
    return MonitoringCoordinator.instance;
  }

  async startCoordination(): Promise<void> {
    // Check public access every 30 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkPublicAccess();
    }, 30000);
    
    // Initial check
    await this.checkPublicAccess();
  }

  stopCoordination(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.activeSessions.clear();
  }

  async checkPublicAccess(): Promise<PublicAccessInfo> {
    try {
      const { data: publicSessions, error } = await supabase
        .from('assessment_instances')
        .select('assessment_id')
        .eq('is_anonymous', true)
        .eq('status', 'in_progress')
        .not('share_token', 'is', null);

      if (error) {
        console.error('Error checking public access:', error);
        return this.publicAccessInfo;
      }

      const assessmentIds = [...new Set(publicSessions?.map(s => s.assessment_id) || [])];
      
      this.publicAccessInfo = {
        activeCount: publicSessions?.length || 0,
        assessmentIds,
        lastChecked: Date.now()
      };

      // Notify active monitoring sessions of changes
      this.notifySessionsOfResourceChange();

      return this.publicAccessInfo;
    } catch (error) {
      console.error('Error in checkPublicAccess:', error);
      return this.publicAccessInfo;
    }
  }

  registerMonitoringSession(sessionId: string, assessmentIds: string[]): MonitoringSession {
    const mode = this.determineOptimalMode();
    
    const session: MonitoringSession = {
      id: sessionId,
      mode,
      startedAt: Date.now(),
      activeAssessments: assessmentIds
    };

    this.activeSessions.set(sessionId, session);
    
    console.log(`Monitoring session ${sessionId} registered in ${mode} mode`);
    
    return session;
  }

  unregisterMonitoringSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    console.log(`Monitoring session ${sessionId} unregistered`);
  }

  private determineOptimalMode(): 'normal' | 'resource_safe' | 'minimal' {
    const { activeCount } = this.publicAccessInfo;
    
    if (activeCount === 0) return 'normal';
    if (activeCount <= 3) return 'resource_safe';
    return 'minimal';
  }

  private notifySessionsOfResourceChange(): void {
    const newMode = this.determineOptimalMode();
    
    this.activeSessions.forEach((session, sessionId) => {
      if (session.mode !== newMode) {
        session.mode = newMode;
        this.activeSessions.set(sessionId, session);
        
        // Dispatch custom event for components to react
        window.dispatchEvent(new CustomEvent('monitoring-mode-change', {
          detail: { sessionId, newMode, publicAccessInfo: this.publicAccessInfo }
        }));
      }
    });
  }

  getPublicAccessInfo(): PublicAccessInfo {
    return { ...this.publicAccessInfo };
  }

  getCurrentMode(): 'normal' | 'resource_safe' | 'minimal' {
    return this.determineOptimalMode();
  }

  hasConflictingAccess(assessmentId: string): boolean {
    return this.publicAccessInfo.assessmentIds.includes(assessmentId);
  }

  async waitForSafeAccess(assessmentId: string, timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      await this.checkPublicAccess();
      
      if (!this.hasConflictingAccess(assessmentId)) {
        return true;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  getResourceSafeQueryConfig() {
    const mode = this.getCurrentMode();
    
    return {
      timeout: mode === 'minimal' ? 2000 : mode === 'resource_safe' ? 3000 : 10000,
      limit: mode === 'minimal' ? 5 : mode === 'resource_safe' ? 15 : 100,
      pollingInterval: mode === 'minimal' ? 120000 : mode === 'resource_safe' ? 60000 : 30000
    };
  }
}

export const monitoringCoordinator = MonitoringCoordinator.getInstance();
export default MonitoringCoordinator;