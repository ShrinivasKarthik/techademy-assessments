// Security utilities for input validation and sanitization

export const SecurityUtils = {
  // Input validation
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  validatePassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // XSS prevention
  sanitizeInput: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // SQL injection prevention for string inputs
  escapeSqlString: (input: string): string => {
    return input.replace(/'/g, "''").replace(/\\/g, '\\\\');
  },

  // Content Security Policy header
  getCSPHeader: (): string => {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://axdwgxtukqqzupboojmx.supabase.co wss://axdwgxtukqqzupboojmx.supabase.co",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');
  },

  // Rate limiting
  createRateLimiter: (maxRequests: number, windowMs: number) => {
    const requests = new Map<string, number[]>();
    
    return (identifier: string): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(identifier)) {
        requests.set(identifier, []);
      }
      
      const userRequests = requests.get(identifier)!;
      
      // Remove old requests outside the window
      const recentRequests = userRequests.filter(time => time > windowStart);
      
      if (recentRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      recentRequests.push(now);
      requests.set(identifier, recentRequests);
      
      return true; // Request allowed
    };
  },

  // Session security
  generateSecureToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Timing attack prevention
  constantTimeCompare: (a: string, b: string): boolean => {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  },

  // File upload validation
  validateFileUpload: (file: File, allowedTypes: string[], maxSize: number): { isValid: boolean; error?: string } => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }
    
    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
      };
    }
    
    // Check file name
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      return {
        isValid: false,
        error: 'File name contains invalid characters. Only letters, numbers, dots, hyphens, and underscores are allowed.'
      };
    }
    
    return { isValid: true };
  },

  // URL validation
  validateURL: (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  },

  // Environment-based security flags
  getSecurityConfig: () => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      enableDevTools: isDevelopment,
      enableConsoleLogging: isDevelopment,
      enablePerformanceTracking: isDevelopment,
      strictCSP: !isDevelopment,
      enableSourceMaps: isDevelopment,
      requireHTTPS: !isDevelopment
    };
  }
};