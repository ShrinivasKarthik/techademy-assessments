import { useState, useCallback, useRef } from 'react';

// Lightweight obfuscation utilities (performance optimized)
export class MCQObfuscation {
  private static readonly CIPHER_KEY = 'mcq_secure_2024';
  
  static encode(correctAnswers: string[]): string {
    try {
      const data = JSON.stringify(correctAnswers);
      const encoded = btoa(data);
      return this.simpleCipher(encoded);
    } catch {
      return btoa(JSON.stringify([]));
    }
  }
  
  static decode(encoded: string): string[] {
    try {
      const deciphered = this.simpleCipher(encoded);
      const decoded = atob(deciphered);
      return JSON.parse(decoded);
    } catch {
      return [];
    }
  }
  
  private static simpleCipher(text: string): string {
    return text.split('').map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ this.CIPHER_KEY.charCodeAt(i % this.CIPHER_KEY.length))
    ).join('');
  }
  
  static generateChecksum(answers: string[]): string {
    const data = answers.sort().join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Performance-optimized timing tracker
export class AnswerTimingTracker {
  private timings: Map<string, {
    startTime: number;
    changes: number;
    totalTime: number;
    lastChange: number;
  }> = new Map();
  
  startQuestion(questionId: string): void {
    const now = performance.now();
    this.timings.set(questionId, {
      startTime: now,
      changes: 0,
      totalTime: 0,
      lastChange: now
    });
  }
  
  recordChange(questionId: string): void {
    const timing = this.timings.get(questionId);
    if (timing) {
      const now = performance.now();
      timing.changes++;
      timing.lastChange = now;
      this.timings.set(questionId, timing);
    }
  }
  
  endQuestion(questionId: string): {
    timeSpent: number;
    changeCount: number;
    averageChangeInterval: number;
  } {
    const timing = this.timings.get(questionId);
    if (!timing) {
      return { timeSpent: 0, changeCount: 0, averageChangeInterval: 0 };
    }
    
    const timeSpent = timing.lastChange - timing.startTime;
    const averageChangeInterval = timing.changes > 1 
      ? timeSpent / (timing.changes - 1) 
      : timeSpent;
    
    return {
      timeSpent: Math.round(timeSpent),
      changeCount: timing.changes,
      averageChangeInterval: Math.round(averageChangeInterval)
    };
  }
  
  getAnalysis(): {
    suspiciousPatterns: string[];
    riskScore: number;
  } {
    const suspiciousPatterns: string[] = [];
    let riskScore = 0;
    
    for (const [questionId, timing] of this.timings) {
      const timeSpent = timing.lastChange - timing.startTime;
      
      // Flag suspiciously fast answers (< 2 seconds)
      if (timeSpent < 2000 && timing.changes > 0) {
        suspiciousPatterns.push(`Q${questionId}: Answered very quickly (${Math.round(timeSpent/1000)}s)`);
        riskScore += 15;
      }
      
      // Flag excessive answer changes (> 10 changes)
      if (timing.changes > 10) {
        suspiciousPatterns.push(`Q${questionId}: Excessive answer changes (${timing.changes})`);
        riskScore += 10;
      }
      
      // Flag uniform timing patterns (same time for multiple questions)
      const roundedTime = Math.round(timeSpent / 1000);
      if (roundedTime > 0) {
        const sameTimeCount = Array.from(this.timings.values())
          .filter(t => Math.round((t.lastChange - t.startTime) / 1000) === roundedTime).length;
        if (sameTimeCount > 3) {
          riskScore += 5;
        }
      }
    }

    return {
      suspiciousPatterns,
      riskScore: Math.min(riskScore, 100)
    };
  }
}

// Lightweight client monitoring (lazy-loaded)
export class ClientMonitor {
  private static instance: ClientMonitor;
  private isActive = false;
  private suspiciousActivities: string[] = [];
  private lastCheck = 0;
  private checkInterval = 30000; // 30 seconds
  
  static getInstance(): ClientMonitor {
    if (!ClientMonitor.instance) {
      ClientMonitor.instance = new ClientMonitor();
    }
    return ClientMonitor.instance;
  }
  
  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    // Passive monitoring with performance consideration
    this.schedulePeriodicChecks();
    this.addPassiveListeners();
  }
  
  stop(): void {
    this.isActive = false;
    this.suspiciousActivities = [];
  }
  
  private schedulePeriodicChecks(): void {
    const check = () => {
      if (!this.isActive) return;
      
      const now = Date.now();
      if (now - this.lastCheck >= this.checkInterval) {
        requestIdleCallback(() => this.performChecks(), { timeout: 1000 });
        this.lastCheck = now;
      }
      
      setTimeout(check, this.checkInterval);
    };
    
    setTimeout(check, this.checkInterval);
  }
  
  private addPassiveListeners(): void {
    // Monitor for context menu (right-click)
    const contextMenuHandler = () => {
      this.logActivity('Context menu accessed');
    };
    
    // Monitor for developer tools (limited detection)
    const keyHandler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        e.key === 'F12'
      ) {
        this.logActivity('Developer tools shortcut detected');
      }
    };
    
    document.addEventListener('contextmenu', contextMenuHandler, { passive: true });
    document.addEventListener('keydown', keyHandler, { passive: true });
  }
  
  private performChecks(): void {
    try {
      // Check for console tampering
      const start = performance.now();
      console.clear();
      const end = performance.now();
      
      if (end - start > 100) {
        this.logActivity('Console interaction detected');
      }
      
      // Check for unusual window properties
      if (window.outerWidth - window.innerWidth > 200 || 
          window.outerHeight - window.innerHeight > 200) {
        this.logActivity('Developer tools panel possibly open');
      }
    } catch {
      // Silently ignore errors to maintain performance
    }
  }
  
  private logActivity(activity: string): void {
    this.suspiciousActivities.push(`${new Date().toISOString()}: ${activity}`);
    
    // Keep only last 20 activities to prevent memory bloat
    if (this.suspiciousActivities.length > 20) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-20);
    }
  }
  
  getReport(): {
    activitiesCount: number;
    activities: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const count = this.suspiciousActivities.length;
    
    return {
      activitiesCount: count,
      activities: this.suspiciousActivities.slice(-10), // Last 10 activities
      riskLevel: count < 3 ? 'low' : count < 7 ? 'medium' : 'high'
    };
  }
}

// Answer submission encryption
export class SubmissionSecurity {
  static encryptSubmission(answers: Record<string, any>, instanceId: string): {
    encryptedData: string;
    checksum: string;
    timestamp: number;
    fingerprint: string;
  } {
    const timestamp = Date.now();
    const fingerprint = this.generateBrowserFingerprint();
    
    const payload = {
      answers,
      instanceId,
      timestamp,
      fingerprint
    };
    
    const encrypted = MCQObfuscation.encode([JSON.stringify(payload)])[0] || '';
    const checksum = MCQObfuscation.generateChecksum([encrypted]);
    
    return {
      encryptedData: encrypted,
      checksum,
      timestamp,
      fingerprint
    };
  }
  
  static decryptSubmission(encryptedData: string, checksum: string): Record<string, any> | null {
    try {
      // Verify checksum
      if (MCQObfuscation.generateChecksum([encryptedData]) !== checksum) {
        throw new Error('Checksum validation failed');
      }
      
      const decrypted = MCQObfuscation.decode(encryptedData);
      if (!decrypted.length) throw new Error('Decryption failed');
      
      const payload = JSON.parse(decrypted[0]);
      
      // Basic timestamp validation (within last 24 hours)
      if (Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
        throw new Error('Submission too old');
      }
      
      return payload;
    } catch {
      return null;
    }
  }
  
  private static generateBrowserFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return MCQObfuscation.generateChecksum([fingerprint]);
  }
}
