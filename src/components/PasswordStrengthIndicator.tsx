import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, AlertTriangle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordCheck {
  label: string;
  test: (password: string) => boolean;
  critical?: boolean;
}

const passwordChecks: PasswordCheck[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
    critical: true
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password)
  },
  {
    label: 'Contains lowercase letter', 
    test: (password) => /[a-z]/.test(password)
  },
  {
    label: 'Contains number',
    test: (password) => /\d/.test(password)
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
  },
  {
    label: 'No common patterns',
    test: (password) => {
      const common = ['password', '123456', 'qwerty', 'abc123', 'admin'];
      return !common.some(pattern => password.toLowerCase().includes(pattern));
    }
  }
];

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, level: 'none', color: 'muted' };
  
  const passedChecks = passwordChecks.filter(check => check.test(password));
  const criticalPassed = passwordChecks.filter(check => check.critical && check.test(password));
  
  // Critical checks must pass for any strength
  if (criticalPassed.length < passwordChecks.filter(check => check.critical).length) {
    return { score: 0, level: 'weak', color: 'destructive' };
  }
  
  const score = (passedChecks.length / passwordChecks.length) * 100;
  
  if (score >= 80) return { score, level: 'strong', color: 'success' };
  if (score >= 60) return { score, level: 'good', color: 'warning' };
  if (score >= 40) return { score, level: 'fair', color: 'secondary' };
  return { score, level: 'weak', color: 'destructive' };
};

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = ''
}) => {
  const strength = getPasswordStrength(password);
  
  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password Strength</span>
          <Badge 
            variant={strength.color === 'success' ? 'default' : 
                    strength.color === 'warning' ? 'secondary' : 
                    'destructive'}
            className="text-xs"
          >
            {strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}
          </Badge>
        </div>
        <Progress 
          value={strength.score} 
          className="h-2"
          // TODO: Add color variants to Progress component based on strength
        />
      </div>

      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Requirements:</span>
        <div className="grid grid-cols-1 gap-1">
          {passwordChecks.map((check, index) => {
            const passed = check.test(password);
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                {passed ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <X className="w-3 h-3 text-red-500" />
                )}
                <span className={passed ? 'text-green-700' : 'text-muted-foreground'}>
                  {check.label}
                  {check.critical && (
                    <AlertTriangle className="w-3 h-3 text-orange-500 ml-1 inline" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {strength.level === 'weak' && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-800">
              <div className="font-medium">Weak password detected</div>
              <div>Please choose a stronger password to protect your account.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;